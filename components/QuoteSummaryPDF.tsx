import React from 'react';
import type { CalculationResults } from './SprayFoamCalculator.tsx';
import type { Costs, CompanyInfo, CustomerInfo } from './EstimatePDF.tsx';

// Utility functions for formatting
function fmt(n: number | undefined, digits = 2) {
  if (n === undefined || Number.isNaN(n) || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fmtCurrency(n: number | undefined) {
  const result = fmt(n, 2);
  return result === "—" ? "—" : `$${result}`;
}

interface QuoteSummaryPDFProps {
  calc: Omit<CalculationResults, 'customer'>;
  costs: Costs;
  companyInfo: CompanyInfo;
  customerInfo: CustomerInfo;
}

const QuoteSummaryPDF: React.FC<QuoteSummaryPDFProps> = ({ calc, costs, companyInfo, customerInfo }) => {
  const overheadPct = costs.subtotal > 0 ? (costs.overheadValue / costs.subtotal) * 100 : 0;
  const salesTaxPct = costs.preTaxTotal > 0 ? (costs.taxValue / costs.preTaxTotal) * 100 : 0;

  return (
    <div className="bg-white text-slate-800 font-sans w-[8.5in] h-[11in] p-[1in] text-[11pt] flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <header className="flex justify-between items-start pb-4 border-b-2 border-blue-600">
          <div>
            <h1 className="text-3xl font-bold text-blue-700">{companyInfo.name}</h1>
            <p className="text-sm text-slate-500">{companyInfo.address}</p>
          </div>
          <h2 className="text-2xl font-semibold text-slate-700 pt-1">Estimate Summary</h2>
        </header>

        <section className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prepared For</h3>
            <p className="text-lg font-bold text-slate-800 mt-1">{customerInfo.name}</p>
            <p className="text-sm text-slate-600">{customerInfo.address}</p>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Overview</h3>
            <p className="text-sm text-slate-700 mt-1">Total Spray Area: <span className="font-bold">{fmt(calc.totalSprayArea)} ft²</span></p>
            <p className="text-sm text-slate-700">Total Board Feet: <span className="font-bold">{fmt(calc.totalBoardFeetWithWaste, 0)} bf</span></p>
          </div>
        </section>

        <section className="mt-10">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Cost Breakdown</h3>
          <div className="w-full text-sm border-t border-slate-200">
            <div className="flex justify-between py-3 border-b border-slate-200">
                <span>Foam Material Cost</span>
                <span className="font-medium">{fmtCurrency(costs.totalMaterialCost)}</span>
            </div>
             {costs.totalInventoryCost > 0 && (
                <div className="flex justify-between py-3 border-b border-slate-200">
                    <span>Additional Materials</span>
                    <span className="font-medium">{fmtCurrency(costs.totalInventoryCost)}</span>
                </div>
            )}
            <div className="flex justify-between py-3 border-b border-slate-200">
                <span>Labor & Equipment</span>
                <span className="font-medium">{fmtCurrency(costs.laborAndEquipmentCost)}</span>
            </div>
             {costs.additionalCostsTotal > 0 && (
                <div className="flex justify-between py-3 border-b border-slate-200">
                    <span>Other Line Items</span>
                    <span className="font-medium">{fmtCurrency(costs.additionalCostsTotal)}</span>
                </div>
            )}
            <div className="flex justify-between py-3 border-b-2 border-slate-300 font-bold text-base">
                <span>Subtotal</span>
                <span>{fmtCurrency(costs.subtotal)}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-200">
                <span>Overhead ({fmt(overheadPct, 0)}%)</span>
                <span className="font-medium">{fmtCurrency(costs.overheadValue)}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-200">
                <span>Sales Tax ({fmt(salesTaxPct, 0)}%)</span>
                <span className="font-medium">{fmtCurrency(costs.taxValue)}</span>
            </div>
          </div>
        </section>

        <section className="mt-10 text-center bg-blue-50/70 p-8 rounded-2xl">
          <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Total Quote Price</h3>
          <p className="text-6xl font-extrabold text-blue-900 tracking-tight mt-1">{fmtCurrency(costs.finalQuote)}</p>
        </section>
      </div>
    </div>
  );
};

export default QuoteSummaryPDF;
