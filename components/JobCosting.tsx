
import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { CalculationResults } from './SprayFoamCalculator.tsx';
import EstimatePDF, { CompanyInfo, CustomerInfo, Costs } from './EstimatePDF.tsx';
import MaterialOrderPDF from './MaterialOrderPDF.tsx';
import QuoteSummaryPDF from './QuoteSummaryPDF.tsx';
import InvoicePDF from './InvoicePDF.tsx';
import { getTimeEntriesForJob, InventoryItem, EstimateRecord } from '../lib/db.ts';
import { calculateCosts, CostSettings } from '../lib/processing.ts';
import * as api from '../lib/api.ts';

// Add declarations for jspdf and html2canvas
declare var jspdf: any;
declare var html2canvas: any;

interface PdfOptions {
  paperSize: 'letter' | 'a4';
  orientation: 'p' | 'l'; // 'p' for portrait, 'l' for landscape
}

interface JobCostingProps {
  calculationResults: CalculationResults;
  onBack: () => void;
  companyInfo: CompanyInfo;
  isInvoiceMode?: boolean;
  initialJobData?: EstimateRecord;
  onFinalizeInvoice?: (finalJobData: EstimateRecord, invoicePdfBlob: Blob) => void;
  onEstimateCreated?: (newJobData: Omit<EstimateRecord, 'id' | 'createdAt'>) => void;
  defaultCosts: CostSettings;
  inventoryItems: InventoryItem[];
}

function fmt(n: number, digits = 2) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fmtCurrency(n: number) {
  const result = fmt(n, 2);
  return result === "—" ? "—" : `$${result}`;
}

interface LineItem {
  id: number;
  description: string;
  cost: number;
}

const EMPTY_CUSTOMER: Omit<CustomerInfo, 'id'> = {
  name: "", address: "", email: "", phone: "",
};

// Simple markdown renderer for displaying the scope in the editor
const renderScopeForDisplay = (text: string = '') => {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .map((line, index) => {
      if (line.startsWith('- ')) {
        return <li key={index} className="ml-4 list-disc">{line.substring(2)}</li>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={index} className="font-semibold mt-2 text-base">{line.substring(2, line.length - 2)}</h4>;
      }
      return <p key={index}>{line}</p>;
    })
};

const getPdfDimensions = (options: PdfOptions): { width: string, height: string } => {
    const sizes = {
        letter: { w: 8.5, h: 11 },
        a4: { w: 8.27, h: 11.69 }
    };
    const { w, h } = sizes[options.paperSize];
    if (options.orientation === 'l') {
        return { width: `${h}in`, height: `${w}in` };
    }
    return { width: `${w}in`, height: `${h}in` };
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            // remove "data:application/pdf;base64," prefix
            resolve(base64data.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
};


export default function JobCosting({
  calculationResults: calc,
  onBack,
  companyInfo,
  isInvoiceMode = false,
  initialJobData,
  onFinalizeInvoice,
  onEstimateCreated,
  defaultCosts,
  inventoryItems
}: JobCostingProps) {
  const [costSettings, setCostSettings] = useState<CostSettings>(defaultCosts);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedScope, setGeneratedScope] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationComplete, setGenerationComplete] = useState(false);
  const [error, setError] = useState('');
  const estimatePdfRef = useRef<HTMLDivElement>(null);
  const materialOrderPdfRef = useRef<HTMLDivElement>(null);
  const quoteSummaryPdfRef = useRef<HTMLDivElement>(null);
  const invoicePdfRef = useRef<HTMLDivElement>(null);
  const [pdfEstimateNumber, setPdfEstimateNumber] = useState('');
  const [pdfOrderNumber, setPdfOrderNumber] = useState('');
  const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState('');
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [summarySaveStatus, setSummarySaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pdfOptions, setPdfOptions] = useState<PdfOptions>({ paperSize: 'letter', orientation: 'p' });
  const [modalCustomerInfo, setModalCustomerInfo] = useState(calc.customer || { ...EMPTY_CUSTOMER, id: 0 });

  useEffect(() => {
    if (isInvoiceMode && initialJobData) {
        const { costsData } = initialJobData;
        if (costsData) {
            setCostSettings({
                ocCostPerSet: costsData.ocCostPerSet,
                ocMarkup: costsData.ocMarkup,
                ccCostPerSet: costsData.ccCostPerSet,
                ccMarkup: costsData.ccMarkup,
                laborRate: costsData.laborRate,
                laborHours: costsData.laborHours,
                equipmentFee: costsData.equipmentFee,
                overheadPercentage: initialJobData.costsData.subtotal > 0 ? (initialJobData.costsData.overheadValue / initialJobData.costsData.subtotal) * 100 : 0,
                salesTax: initialJobData.costsData.preTaxTotal > 0 ? (initialJobData.costsData.taxValue / initialJobData.costsData.preTaxTotal) * 100 : 0,
            });
            setLineItems(costsData.lineItems || []);
        }
        if (initialJobData.id) {
            getTimeEntriesForJob(initialJobData.id).then(entries => {
                const totalTrackedHours = entries.reduce((sum, entry) => sum + (entry.durationHours || 0), 0);
                if (totalTrackedHours > 0) {
                    setCostSettings(prev => ({ ...prev, laborHours: parseFloat(totalTrackedHours.toFixed(2)) }));
                }
            });
        }
    } else {
        setCostSettings(defaultCosts);
    }
  }, [isInvoiceMode, initialJobData, defaultCosts]);

  useEffect(() => {
    if (isModalOpen && !isInvoiceMode) {
        let scope = `**Scope of Work**\n\n`;
        if (calc.wallBoardFeetWithWaste > 0) {
            scope += `- Apply approximately ${calc.wallThicknessIn} inches of ${calc.wallFoamType === 'open-cell' ? 'Open-Cell' : 'Closed-Cell'} spray foam to ~${fmt(calc.wallTotal, 0)} sq ft of wall area${calc.gableAdd > 0 ? ' (including gables)' : ''}.\n`;
        }
        if (calc.roofBoardFeetWithWaste > 0) {
            scope += `- Apply approximately ${calc.roofThicknessIn} inches of ${calc.roofFoamType === 'open-cell' ? 'Open-Cell' : 'Closed-Cell'} spray foam to ~${fmt(calc.roofArea, 0)} sq ft of roof deck area.\n`;
        }
        if (calc.inventoryLineItems && calc.inventoryLineItems.length > 0) {
            scope += `\n**Additional Materials**\n- Supply and install other specified materials as per the estimate.\n`;
        }
        scope += `\n**General Procedures**\n- Site preparation to protect non-spray areas.\n- Clean up of work area upon completion.\n`;
        setGeneratedScope(scope);
    }
  }, [isModalOpen, isInvoiceMode, calc]);


  const costs: Costs = useMemo(() => {
    return calculateCosts(calc, costSettings, lineItems, inventoryItems);
  }, [calc, costSettings, lineItems, inventoryItems]);

  const handleCostSettingChange = (field: keyof CostSettings, value: number) => {
    setCostSettings(prev => ({ ...prev, [field]: value }));
  };

  const addLineItem = () => setLineItems(prev => [...prev, { id: Date.now(), description: '', cost: 0 }]);
  const removeLineItem = (id: number) => setLineItems(prev => prev.filter(item => item.id !== id));
  const updateLineItem = (id: number, field: 'description' | 'cost', value: string | number) => {
    setLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSaveQuoteSummary = async () => {
    if (!calc.customer?.id || !onEstimateCreated) {
        alert("A customer must be selected to save a quote summary.");
        return;
    }
    setIsSavingSummary(true);
    setSummarySaveStatus('idle');
    try {
        const summaryNumber = `SUMM-${new Date().getTime().toString().slice(-6)}`;
        const summaryElement = quoteSummaryPdfRef.current;
        if (!summaryElement) throw new Error("Quote Summary PDF template element not found.");
        const summaryCanvas = await html2canvas(summaryElement, { scale: 2 });
        const summaryImgData = summaryCanvas.toDataURL('image/png');
        const summaryPdf = new jspdf.jsPDF({ orientation: 'p', unit: 'in', format: 'letter' });
        summaryPdf.addImage(summaryImgData, 'PNG', 0, 0, summaryPdf.internal.pageSize.getWidth(), summaryPdf.internal.pageSize.getHeight());
        const summaryPdfBlob = summaryPdf.output('blob');
        const placeholderBlob = new Blob(['N/A'], { type: 'text/plain' });

        onEstimateCreated({
            customerId: calc.customer.id,
            estimatePdf: summaryPdfBlob,
            materialOrderPdf: placeholderBlob,
            estimateNumber: summaryNumber,
            calcData: calc,
            costsData: costs,
            scopeOfWork: 'N/A for Quote Summary',
            status: 'estimate',
        });
        setSummarySaveStatus('success');
        setTimeout(() => setSummarySaveStatus('idle'), 3000);
    } catch (e) {
        console.error(e);
        setSummarySaveStatus('error');
        alert(`Failed to save quote summary. ${e instanceof Error ? e.message : 'An unknown error occurred.'}`);
        setTimeout(() => setSummarySaveStatus('idle'), 5000);
    } finally {
        setIsSavingSummary(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (generationComplete && !isInvoiceMode && onEstimateCreated) {
        // The App component will handle navigation after the job is created
    }
    setTimeout(() => {
        setGenerationComplete(false);
        setGeneratedScope('');
        setError('');
    }, 300);
  };
  
  const handleOpenFinalizeModal = () => {
    if (initialJobData?.calcData?.customer) {
        setModalCustomerInfo(initialJobData.calcData.customer);
    }
    setIsModalOpen(true);
  };

  const handleGenerateInvoicePdf = async () => {
    if (!onFinalizeInvoice || !initialJobData) return;
    setIsGenerating(true);
    setError('');
    setGenerationComplete(false);
    setGenerationStatus('Generating Final Invoice PDF...');
    const invoiceNumber = initialJobData.estimateNumber.replace('EST-', 'INV-');
    setGeneratedInvoiceNumber(invoiceNumber);
    try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const invoiceElement = invoicePdfRef.current;
        if (!invoiceElement) throw new Error("Invoice PDF template element not found.");
        const canvas = await html2canvas(invoiceElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({ orientation: pdfOptions.orientation, unit: 'in', format: pdfOptions.paperSize });
        pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        setGenerationStatus('Finalizing...');
        const updatedRecord: EstimateRecord = { ...initialJobData, costsData: costs };
        onFinalizeInvoice(updatedRecord, pdfBlob);
        setGenerationComplete(true);
    } catch(e) {
        console.error("Failed to generate invoice PDF", e);
        setError(`Failed to generate invoice. ${e instanceof Error ? e.message : 'An unknown error occurred.'}`);
    } finally {
        setIsGenerating(false);
        setGenerationStatus('');
    }
  };


  const handleGeneratePdf = async () => {
    if (!modalCustomerInfo.id || !onEstimateCreated) {
        setError("A customer must be selected to save an estimate.");
        return;
    }
    setIsGenerating(true);
    setError('');
    setGenerationComplete(false);
    try {
        setGenerationStatus('Generating PDFs...');
        const estNumber = `EST-${new Date().getTime().toString().slice(-6)}`;
        setPdfEstimateNumber(estNumber);
        setPdfOrderNumber(`ORD-${estNumber.slice(4)}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        const estimateElement = estimatePdfRef.current;
        if (!estimateElement) throw new Error("Estimate PDF template element not found.");
        const estCanvas = await html2canvas(estimateElement, { scale: 2 });
        const estImgData = estCanvas.toDataURL('image/png');
        const estPdf = new jspdf.jsPDF({ orientation: pdfOptions.orientation, unit: 'in', format: pdfOptions.paperSize });
        estPdf.addImage(estImgData, 'PNG', 0, 0, estPdf.internal.pageSize.getWidth(), estPdf.internal.pageSize.getHeight());
        const estPdfBlob = estPdf.output('blob');
        const materialElement = materialOrderPdfRef.current;
        if (!materialElement) throw new Error("Material Order PDF template element not found.");
        const matCanvas = await html2canvas(materialElement, { scale: 2 });
        const matImgData = matCanvas.toDataURL('image/png');
        const matPdf = new jspdf.jsPDF({ orientation: 'p', unit: 'in', format: 'letter' });
        matPdf.addImage(matImgData, 'PNG', 0, 0, matPdf.internal.pageSize.getWidth(), matPdf.internal.pageSize.getHeight());
        const matPdfBlob = matPdf.output('blob');

        setGenerationStatus('Saving...');
        onEstimateCreated({
            customerId: modalCustomerInfo.id,
            estimatePdf: estPdfBlob,
            materialOrderPdf: matPdfBlob,
            estimateNumber: estNumber,
            calcData: calc,
            costsData: costs,
            scopeOfWork: generatedScope,
            status: 'estimate',
        });
        setGenerationComplete(true);
        setGenerationStatus('Complete!');
    } catch (e) {
        console.error("Failed to generate PDFs", e);
        setError(`Failed to generate PDFs. ${e instanceof Error ? e.message : 'An unknown error occurred.'}`);
    } finally {
        setIsGenerating(false);
    }
  };
  
  const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm";
  const h2 = "text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100";
  const label = "text-sm font-medium text-slate-600 dark:text-slate-300";
  const input = "mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-4 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white";

  const CostInput = ({ label, name, value, onChange, type = 'number', smallText }: { label: string, name: keyof CostSettings, value: number, onChange: (field: keyof CostSettings, value: number) => void, type?: string, smallText?: string }) => (
    <label className="block">
        <span className={label}>{label}</span>
        <input type={type} min={0} step={name.includes('Markup') || name.includes('Percentage') || name.includes('Tax') ? 1 : 0.01} className={input} value={value} onChange={(e) => onChange(name, parseFloat(e.target.value) || 0)} />
        {smallText && <span className="text-xs text-slate-500 dark:text-slate-400">{smallText}</span>}
    </label>
  );

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
          &larr; Back to {isInvoiceMode ? 'Job Details' : 'Calculator'}
        </button>
        <h1 className="text-2xl font-bold dark:text-white">{isInvoiceMode ? 'Finalize Invoice' : 'Job Costing & Quoting'}</h1>
      </div>

      <div className={`${card} p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center`}>
          <div><p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Total Area</p><p className="text-2xl font-bold">{fmt(calc.totalSprayArea, 0)} ft²</p></div>
          <div><p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Board Feet</p><p className="text-2xl font-bold">{fmt(calc.totalBoardFeetWithWaste, 0)}</p></div>
          <div><p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">OC Sets</p><p className="text-2xl font-bold">{fmt(calc.ocSets, 2)}</p></div>
          <div><p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">CC Sets</p><p className="text-2xl font-bold">{fmt(calc.ccSets, 2)}</p></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${card} p-6`}>
          <h2 className={h2}>Cost Settings</h2>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-medium">Foam Costs</h3>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <CostInput label="OC Cost/Set ($)" name="ocCostPerSet" value={costSettings.ocCostPerSet} onChange={handleCostSettingChange} />
                <CostInput label="OC Markup (%)" name="ocMarkup" value={costSettings.ocMarkup} onChange={handleCostSettingChange} />
                <CostInput label="CC Cost/Set ($)" name="ccCostPerSet" value={costSettings.ccCostPerSet} onChange={handleCostSettingChange} />
                <CostInput label="CC Markup (%)" name="ccMarkup" value={costSettings.ccMarkup} onChange={handleCostSettingChange} />
              </div>
            </div>
             <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
              <h3 className="font-medium">Labor & Equipment</h3>
              <div className="grid grid-cols-2 gap-3 mt-2">
                 <CostInput label="Labor Rate ($/hr)" name="laborRate" value={costSettings.laborRate} onChange={handleCostSettingChange} />
                 <CostInput label="Est. Labor (hrs)" name="laborHours" value={costSettings.laborHours} onChange={handleCostSettingChange} />
                 <CostInput label="Equipment Fee ($)" name="equipmentFee" value={costSettings.equipmentFee} onChange={handleCostSettingChange} />
              </div>
            </div>
             <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
              <h3 className="font-medium">Overhead & Tax</h3>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <CostInput label="Overhead (%)" name="overheadPercentage" value={costSettings.overheadPercentage} onChange={handleCostSettingChange} />
                <CostInput label="Sales Tax (%)" name="salesTax" value={costSettings.salesTax} onChange={handleCostSettingChange} />
              </div>
            </div>
          </div>
        </div>

        <div className={`${card} p-6`}>
          <h2 className={h2}>Quote Summary</h2>
           <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Foam Materials</span><span className="font-semibold">{fmtCurrency(costs.totalMaterialCost)}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Other Materials</span><span className="font-semibold">{fmtCurrency(costs.totalInventoryCost)}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Labor & Equipment</span><span className="font-semibold">{fmtCurrency(costs.laborAndEquipmentCost)}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Line Items</span><span className="font-semibold">{fmtCurrency(costs.additionalCostsTotal)}</span></div>
              <div className="flex justify-between items-center font-bold pt-2 border-t border-slate-200 dark:border-slate-600"><span className="dark:text-white">Subtotal</span><span className="dark:text-white">{fmtCurrency(costs.subtotal)}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Overhead</span><span className="font-semibold">{fmtCurrency(costs.overheadValue)}</span></div>
              <div className="flex justify-between items-center font-bold"><span className="dark:text-white">Pre-Tax Total</span><span className="dark:text-white">{fmtCurrency(costs.preTaxTotal)}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Sales Tax</span><span className="font-semibold">{fmtCurrency(costs.taxValue)}</span></div>
              <div className="mt-4 pt-4 border-t-2 border-slate-300 dark:border-slate-500 flex justify-between items-center">
                  <span className="text-xl font-bold dark:text-white">Final Quote</span>
                  <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{fmtCurrency(costs.finalQuote)}</span>
              </div>
           </div>
        </div>
      </div>

      <div className={`${card} p-6`}>
        <h2 className={h2}>Additional Line Items</h2>
        <div className="mt-3 space-y-3">
          {lineItems.map(item => (
            <div key={item.id} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
              <input type="text" placeholder="Description (e.g., Travel Surcharge)" value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)} className={input + " mt-0"} />
              <input type="number" placeholder="Cost" value={item.cost} onChange={e => updateLineItem(item.id, 'cost', parseFloat(e.target.value) || 0)} className={input + " mt-0"} />
              <button onClick={() => removeLineItem(item.id)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 font-bold">-</button>
            </div>
          ))}
        </div>
        <button onClick={addLineItem} className="mt-3 rounded-lg bg-slate-100 dark:bg-slate-600 px-3 py-1.5 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-500">+ Add Line Item</button>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row justify-end items-center gap-3">
        {isInvoiceMode ? (
            <button onClick={handleOpenFinalizeModal} className="w-full sm:w-auto rounded-lg bg-blue-600 px-6 py-3 text-lg text-white font-semibold shadow-sm hover:bg-blue-700 transition-colors">Finalize & Generate Invoice</button>
        ) : (
            <>
                <button onClick={handleSaveQuoteSummary} disabled={isSavingSummary || !calc.customer} className="w-full sm:w-auto rounded-lg bg-slate-200 dark:bg-slate-600 px-4 py-2 text-slate-800 dark:text-slate-100 font-medium shadow-sm hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {summarySaveStatus === 'success' ? '✓ Saved!' : summarySaveStatus === 'error' ? 'Error!' : 'Save Quick Summary'}
                </button>
                <button onClick={() => setIsModalOpen(true)} disabled={!calc.customer} className="w-full sm:w-auto rounded-lg bg-blue-600 px-6 py-3 text-lg text-white font-semibold shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Create Full Estimate & Material Order</button>
            </>
        )}
      </div>
      {!calc.customer && !isInvoiceMode && (
          <p className="text-center text-sm text-amber-700 dark:text-amber-400 mt-2">Note: A customer must be selected on the calculator page to save an estimate.</p>
      )}

      <div className="absolute -left-[9999px] top-auto">
        <div ref={estimatePdfRef}><EstimatePDF calc={calc} costs={costs} companyInfo={companyInfo} customerInfo={modalCustomerInfo} scopeOfWork={generatedScope} estimateNumber={pdfEstimateNumber} pdfWidth={getPdfDimensions(pdfOptions).width} pdfHeight={getPdfDimensions(pdfOptions).height} /></div>
        <div ref={materialOrderPdfRef}><MaterialOrderPDF calc={calc} costs={costs} companyInfo={companyInfo} customerInfo={modalCustomerInfo} orderNumber={pdfOrderNumber} /></div>
        <div ref={quoteSummaryPdfRef}><QuoteSummaryPDF calc={calc} costs={costs} companyInfo={companyInfo} customerInfo={calc.customer || { ...EMPTY_CUSTOMER, id: 0}} /></div>
        <div ref={invoicePdfRef}><InvoicePDF calc={initialJobData?.calcData || calc} costs={costs} companyInfo={companyInfo} customerInfo={modalCustomerInfo} invoiceNumber={generatedInvoiceNumber} scopeOfWork={initialJobData?.scopeOfWork || ''} pdfWidth={getPdfDimensions(pdfOptions).width} pdfHeight={getPdfDimensions(pdfOptions).height} /></div>
      </div>
      
      {isModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
              <div className="relative w-full max-w-2xl rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl">
                  { !generationComplete && <button onClick={handleCloseModal} className="absolute top-4 right-4 text-slate-400">&times;</button> }
                  <h2 className="text-xl font-bold dark:text-white">{isInvoiceMode ? "Finalize Invoice" : "Create Estimate Documents"}</h2>

                  {generationComplete ? (
                    <div className="text-center py-8">
                        <svg className="w-16 h-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <h3 className="mt-4 text-lg font-semibold">Success!</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Documents have been generated and will be added to the database.</p>
                        <button onClick={handleCloseModal} className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700">Close</button>
                    </div>
                  ) : isGenerating ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="mt-4 text-sm font-medium">{generationStatus || 'Generating...'}</p>
                    </div>
                  ) : (
                    <>
                    {!isInvoiceMode && (
                        <div className="mt-4 space-y-3">
                            <div><label className={label}>Scope of Work / Description</label><textarea value={generatedScope} onChange={e => setGeneratedScope(e.target.value)} rows={8} className={`${input} text-sm`}></textarea></div>
                            <div>
                               <span className={label}>PDF Options</span>
                               <div className="flex gap-2 mt-1">
                                    <select value={pdfOptions.paperSize} onChange={e => setPdfOptions(p => ({...p, paperSize: e.target.value as 'letter' | 'a4'}))} className="rounded-md border-slate-300 dark:border-slate-500 text-sm"><option value="letter">Letter</option><option value="a4">A4</option></select>
                                    <select value={pdfOptions.orientation} onChange={e => setPdfOptions(p => ({...p, orientation: e.target.value as 'p' | 'l'}))} className="rounded-md border-slate-300 dark:border-slate-500 text-sm"><option value="p">Portrait</option><option value="l">Landscape</option></select>
                               </div>
                            </div>
                        </div>
                    )}
                    {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-md">{error}</p>}
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={handleCloseModal}>Cancel</button>
                        <button type="button" onClick={isInvoiceMode ? handleGenerateInvoicePdf : handleGeneratePdf} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700">
                            {isInvoiceMode ? "Generate & Save Invoice" : "Generate & Save Estimate"}
                        </button>
                    </div>
                    </>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}
