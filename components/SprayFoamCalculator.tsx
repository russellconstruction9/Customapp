import React, { useMemo, useState, useEffect, useRef } from "react";
import { CustomerInfo } from './EstimatePDF.tsx';
import { calculateResults } from '../lib/processing.ts';
import { InventoryItem } from '../lib/db.ts';

export type FoamType = 'open-cell' | 'closed-cell';
export type CalculatorType = 'building' | 'walls' | 'flat-area' | 'custom';

export interface AdditionalSection {
  id: number;
  length: number;
  width: number;
  type: 'walls' | 'roof';
}

export interface InventoryLineItem {
  id: number; // Unique ID for the line in the list, not the inventory item id
  itemId: number | '';
  quantity: number;
}

export interface CalculationResults {
  pitchValid: boolean;
  risePer12: number;
  slopeFactor: number;
  perimeter: number;
  wallRectArea: number;
  gableAdd: number;
  wallTotal: number;
  roofArea: number;
  totalSprayArea: number;
  totalBoardFeetBase: number;
  wallBoardFeetWithWaste: number;
  roofBoardFeetWithWaste: number;
  totalBoardFeetWithWaste: number;
  wallFoamType: FoamType;
  roofFoamType: FoamType;
  wallThicknessIn: number;
  roofThicknessIn: number;
  ocSets: number;
  ccSets: number;
  totalOpenCellBoardFeet: number;
  totalClosedCellBoardFeet: number;
  inventoryLineItems: InventoryLineItem[];
  customer?: CustomerInfo;
}

// Interface for the props that control the calculator's state
export interface CalculatorInputs {
  calculatorType: CalculatorType;
  length: number;
  width: number;
  wallHeight: number;
  pitchInput: string;
  totalWallLength: number;
  includeGableTriangles: boolean;
  wallFoamType: FoamType;
  wallThicknessIn: number;
  wallWastePct: number;
  roofFoamType: FoamType;
  roofThicknessIn: number;
  roofWastePct: number;
  openCellYield: number;
  closedCellYield: number;
  additionalSections: AdditionalSection[];
  inventoryLineItems: InventoryLineItem[];
}

function fmt(n: number, digits = 2) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}


interface SprayFoamCalculatorProps {
  onProceedToCosting: (results: CalculationResults) => void;
  customers: CustomerInfo[];
  setIsAddCustomerModalOpen: (isOpen: boolean) => void;
  selectedCustomerId: number | '';
  setSelectedCustomerId: (id: number | '') => void;
  calculatorInputs: CalculatorInputs;
  setCalculatorInputs: React.Dispatch<React.SetStateAction<CalculatorInputs>>;
  defaultYields: { openCellYield: number, closedCellYield: number };
  inventoryItems: InventoryItem[];
  defaultCalculatorInputs: CalculatorInputs;
}

export default function SprayFoamCalculator({ 
  onProceedToCosting, 
  customers, 
  setIsAddCustomerModalOpen,
  selectedCustomerId,
  setSelectedCustomerId,
  calculatorInputs,
  setCalculatorInputs,
  defaultYields,
  inventoryItems,
  defaultCalculatorInputs
}: SprayFoamCalculatorProps) {

  
  // Apply default yields from settings if they haven't been changed yet
  useEffect(() => {
    setCalculatorInputs(prev => ({
        ...prev,
        openCellYield: prev.openCellYield === 16000 ? defaultYields.openCellYield : prev.openCellYield,
        closedCellYield: prev.closedCellYield === 4000 ? defaultYields.closedCellYield : prev.closedCellYield
    }));
  }, [defaultYields, setCalculatorInputs]);

  const {
    length, width, wallHeight, pitchInput
  } = calculatorInputs;

  const handleInputChange = (field: keyof Omit<CalculatorInputs, 'additionalSections' | 'inventoryLineItems'>, value: any) => {
    const numericFields: (keyof CalculatorInputs)[] = [
      'length', 'width', 'wallHeight', 'wallThicknessIn', 'wallWastePct',
      'roofThicknessIn', 'roofWastePct', 'openCellYield', 'closedCellYield', 'totalWallLength'
    ];
    if (numericFields.includes(field)) {
      value = parseFloat(value) || 0;
    }
    setCalculatorInputs(prev => ({ ...prev, [field]: value }));
  };
  
  const handleCalculatorTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as CalculatorInputs['calculatorType'];
    setCalculatorInputs(prev => ({
        ...defaultCalculatorInputs,
        // Persist important fields across type changes
        inventoryLineItems: prev.inventoryLineItems,
        openCellYield: prev.openCellYield,
        closedCellYield: prev.closedCellYield,
        // Set the new type
        calculatorType: newType,
    }));
  };

  const handleAddSection = () => {
    setCalculatorInputs(prev => ({
        ...prev,
        additionalSections: [
            ...prev.additionalSections,
            { id: Date.now(), length: 0, width: 0, type: 'walls' }
        ]
    }));
  };

  const handleRemoveSection = (id: number) => {
    setCalculatorInputs(prev => ({
        ...prev,
        additionalSections: prev.additionalSections.filter(s => s.id !== id)
    }));
  };

  const handleSectionChange = (id: number, field: keyof Omit<AdditionalSection, 'id'>, value: string | number) => {
    setCalculatorInputs(prev => ({
        ...prev,
        additionalSections: prev.additionalSections.map(s => 
            s.id === id ? { ...s, [field]: (field === 'length' || field === 'width') ? parseFloat(value as string) || 0 : value } : s
        )
    }));
  };

  // --- Inventory Line Item Handlers ---
  const handleAddInventoryLineItem = () => {
    setCalculatorInputs(prev => ({
      ...prev,
      inventoryLineItems: [
        ...prev.inventoryLineItems,
        { id: Date.now(), itemId: '', quantity: 1 }
      ]
    }));
  };

  const handleRemoveInventoryLineItem = (id: number) => {
    setCalculatorInputs(prev => ({
      ...prev,
      inventoryLineItems: prev.inventoryLineItems.filter(item => item.id !== id)
    }));
  };

  const handleInventoryLineItemChange = (id: number, field: keyof Omit<InventoryLineItem, 'id'>, value: string | number) => {
    setCalculatorInputs(prev => ({
      ...prev,
      inventoryLineItems: prev.inventoryLineItems.map(item =>
        item.id === id ? { ...item, [field]: typeof value === 'string' ? (field === 'itemId' ? parseInt(value) : value) : value } : item
      )
    }));
  };

  const calc = useMemo(() => {
    return calculateResults(calculatorInputs);
  }, [calculatorInputs]);

  const prevCustomersCount = useRef(customers.length);
  useEffect(() => {
    if (customers.length > prevCustomersCount.current) {
      const newestCustomer = customers.reduce((latest, current) => current.id > latest.id ? current : latest, customers[0]);
      if (newestCustomer) setSelectedCustomerId(newestCustomer.id);
    }
    prevCustomersCount.current = customers.length;
  }, [customers, setSelectedCustomerId]);

  function handleProceedToCosting() {
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    onProceedToCosting({ ...calc, customer: selectedCustomer });
  }

  function copyResults() {
    const { includeGableTriangles, wallFoamType, wallThicknessIn, wallWastePct, roofFoamType, roofThicknessIn, roofWastePct, openCellYield, closedCellYield, additionalSections } = calculatorInputs;
    const lines = [
      `Inputs`, `  Length: ${length} ft`, `  Width: ${width} ft`, `  Wall height (eave): ${wallHeight} ft`,
      `  Roof pitch: ${pitchInput} (${calc.pitchValid ? fmt(calc.risePer12 * 12, 2) + " in 12" : "invalid"})`,
      `  Include gable triangles: ${includeGableTriangles ? "Yes" : "No"}`, `  Wall Foam Type: ${wallFoamType}`,
      `  Wall Thickness: ${wallThicknessIn} in`, `  Wall Waste: ${wallWastePct}%`, `  Roof Foam Type: ${roofFoamType}`,
      `  Roof Thickness: ${roofThicknessIn} in`, `  Roof Waste: ${roofWastePct}%`,
    ];
    if (additionalSections.length > 0) {
        lines.push(``, `Additional Areas`);
        additionalSections.forEach((s, i) => {
            lines.push(`  Area ${i+1}: ${s.length} ft x ${s.width} ft (${s.type}) = ${fmt(s.length * s.width, 2)} ft²`);
        });
    }
    lines.push(
      ``, `Results`,
      `  Perimeter: ${fmt(calc.perimeter, 2)} ft`, `  Wall area (rectangles): ${fmt(calc.wallRectArea, 2)} ft²`,
      includeGableTriangles ? `  Gable triangle add-on: ${fmt(calc.gableAdd, 2)} ft²` : undefined,
      `  Wall total: ${fmt(calc.wallTotal, 2)} ft²`, calc.pitchValid ? `  Roof slope factor: ${fmt(calc.slopeFactor, 4)}` : `  Roof slope factor: —`,
      calc.pitchValid ? `  Roof underside area: ${fmt(calc.roofArea, 2)} ft²` : `  Roof underside area: —`,
      `  TOTAL spray area: ${fmt(calc.totalSprayArea, 2)} ft²`, ``,
      `  Total Board Feet (no waste): ${fmt(calc.totalBoardFeetBase, 0)} bf`,
      `  Wall Board Feet (+waste): ${fmt(calc.wallBoardFeetWithWaste, 0)} bf`,
      `  Roof Board Feet (+waste): ${fmt(calc.roofBoardFeetWithWaste, 0)} bf`,
      `  TOTAL Board Feet (+waste): ${fmt(calc.totalBoardFeetWithWaste, 0)} bf`, ``,
      `Material Sets Required`,
      calc.ocSets > 0 ? `  Open-cell sets @ ${openCellYield} bf/set: ${fmt(calc.ocSets, 2)} sets` : undefined,
      calc.ccSets > 0 ? `  Closed-cell sets @ ${closedCellYield} bf/set: ${fmt(calc.ccSets, 2)} sets` : undefined,
    );
    navigator.clipboard.writeText(lines.filter(Boolean).join("\n"));
  }

  const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm";
  const h2 = "text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100";
  const label = "text-sm font-medium text-slate-600 dark:text-slate-300";
  const input = "mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-4 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white";
  const small = "text-xs text-slate-500 dark:text-slate-400";
  const select = `${input} appearance-none`;
  
  const showRoofSettings = ['building', 'custom'].includes(calculatorInputs.calculatorType);
  const showWallSettings = ['building', 'walls', 'custom'].includes(calculatorInputs.calculatorType);

  return (
    <>
    <div className="mx-auto max-w-3xl p-4 space-y-4">
       <div className={`${card} p-6`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                    <span className={label}>Calculator Type</span>
                    <select className={select} value={calculatorInputs.calculatorType} onChange={handleCalculatorTypeChange}>
                        <option value="building">Building with Roof</option>
                        <option value="walls">Walls Only</option>
                        <option value="flat-area">Flat Area (Attic/Slab)</option>
                        <option value="custom">Custom Areas</option>
                    </select>
                </label>
                <label className="block">
                    <span className={label}>Select Customer (Optional)</span>
                    <select
                    className={select}
                    value={selectedCustomerId}
                    onChange={(e) => {
                        if (e.target.value === '__add_new__') setIsAddCustomerModalOpen(true);
                        else setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')
                    }}
                    >
                    <option value="">-- New / Walk-in Customer --</option>
                    {customers.map(customer => (<option key={customer.id} value={customer.id}>{customer.name}</option>))}
                    <option value="__add_new__" className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/50 dark:text-blue-300">+ Add New Customer...</option>
                    </select>
                </label>
            </div>
        </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={card + " p-6"}>
           {calculatorInputs.calculatorType === 'building' && (
                <>
                    <h2 className={h2}>Main Building Dimensions</h2>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <label className="block"><span className={label}>Length (ft)</span><input type="number" min={0} step={2.5} className={input} value={calculatorInputs.length} onChange={(e) => handleInputChange('length', e.target.value)} /></label>
                        <label className="block"><span className={label}>Width (ft)</span><input type="number" min={0} step={2.5} className={input} value={calculatorInputs.width} onChange={(e) => handleInputChange('width', e.target.value)} /></label>
                        <label className="block"><span className={label}>Wall Height (ft)</span><input type="number" min={0} step={1} className={input} value={calculatorInputs.wallHeight} onChange={(e) => handleInputChange('wallHeight', e.target.value)} /></label>
                        <label className="block"><span className={label}>Roof Pitch</span><input type="text" className={input} value={calculatorInputs.pitchInput} onChange={(e) => handleInputChange('pitchInput', e.target.value)} placeholder="e.g., 4/12 or 18°" /><span className={small}>e.g. 4/12, 18deg</span></label>
                        <label className="col-span-2 mt-2 inline-flex items-center gap-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={calculatorInputs.includeGableTriangles} onChange={(e) => handleInputChange('includeGableTriangles', e.target.checked)} /><span className="text-sm">Include gable-end triangles</span></label>
                    </div>
                </>
           )}
           {calculatorInputs.calculatorType === 'walls' && (
                <>
                    <h2 className={h2}>Wall Dimensions</h2>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <label className="block col-span-2"><span className={label}>Total Wall Length (ft)</span><input type="number" min={0} step={2.5} className={input} value={calculatorInputs.totalWallLength} onChange={(e) => handleInputChange('totalWallLength', e.target.value)} /></label>
                        <label className="block col-span-2"><span className={label}>Average Wall Height (ft)</span><input type="number" min={0} step={1} className={input} value={calculatorInputs.wallHeight} onChange={(e) => handleInputChange('wallHeight', e.target.value)} /></label>
                    </div>
                </>
           )}
           {calculatorInputs.calculatorType === 'flat-area' && (
                <>
                    <h2 className={h2}>Flat Area Dimensions</h2>
                    <p className={small + " -mt-1"}>For attic floors, slabs, flat roofs, etc.</p>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <label className="block"><span className={label}>Length (ft)</span><input type="number" min={0} step={2.5} className={input} value={calculatorInputs.length} onChange={(e) => handleInputChange('length', e.target.value)} /></label>
                        <label className="block"><span className={label}>Width (ft)</span><input type="number" min={0} step={2.5} className={input} value={calculatorInputs.width} onChange={(e) => handleInputChange('width', e.target.value)} /></label>
                    </div>
                </>
           )}
           {calculatorInputs.calculatorType === 'custom' && (
                <div className="text-center p-6 bg-slate-50 dark:bg-slate-600/30 rounded-lg">
                    <h2 className={h2}>Custom Calculation</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        This mode calculates totals based only on the sections you add below. Use the "Additional Areas" section to build your estimate piece by piece.
                    </p>
                </div>
           )}
        </div>

        <div className={card + " p-6"}>
          <h2 className={h2}>Production Settings</h2>
          <div className="mt-4 space-y-4">
            {showWallSettings && (
                <div>
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">Walls</h3>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                     <label className="block col-span-2"><span className={label}>Foam Type</span><select className={select} value={calculatorInputs.wallFoamType} onChange={(e) => handleInputChange('wallFoamType', e.target.value)}><option value="open-cell">Open-cell</option><option value="closed-cell">Closed-cell</option></select></label>
                    <label className="block"><span className={label}>Thickness (in)</span><input type="number" min={0} step={0.5} className={input} value={calculatorInputs.wallThicknessIn} onChange={(e) => handleInputChange('wallThicknessIn', e.target.value)} /></label>
                    <label className="block"><span className={label}>Waste (%)</span><input type="number" min={0} step={1} className={input} value={calculatorInputs.wallWastePct} onChange={(e) => handleInputChange('wallWastePct', e.target.value)} /></label>
                  </div>
                </div>
            )}
            {showRoofSettings && (
                <div className={`${showWallSettings ? 'border-t border-slate-200 dark:border-slate-600 pt-4' : ''}`}>
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">Roof / Ceilings</h3>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <label className="block col-span-2"><span className={label}>Foam Type</span><select className={select} value={calculatorInputs.roofFoamType} onChange={(e) => handleInputChange('roofFoamType', e.target.value)}><option value="open-cell">Open-cell</option><option value="closed-cell">Closed-cell</option></select></label>
                    <label className="block"><span className={label}>Thickness (in)</span><input type="number" min={0} step={0.5} className={input} value={calculatorInputs.roofThicknessIn} onChange={(e) => handleInputChange('roofThicknessIn', e.target.value)} /></label>
                    <label className="block"><span className={label}>Waste (%)</span><input type="number" min={0} step={1} className={input} value={calculatorInputs.roofWastePct} onChange={(e) => handleInputChange('roofWastePct', e.target.value)} /></label>
                  </div>
                </div>
            )}
            {calculatorInputs.calculatorType === 'flat-area' && (
                <div>
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">Foam Application</h3>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <label className="block col-span-2"><span className={label}>Foam Type</span><select className={select} value={calculatorInputs.roofFoamType} onChange={(e) => handleInputChange('roofFoamType', e.target.value)}><option value="open-cell">Open-cell</option><option value="closed-cell">Closed-cell</option></select></label>
                    <label className="block"><span className={label}>Thickness (in)</span><input type="number" min={0} step={0.5} className={input} value={calculatorInputs.roofThicknessIn} onChange={(e) => handleInputChange('roofThicknessIn', e.target.value)} /></label>
                    <label className="block"><span className={label}>Waste (%)</span><input type="number" min={0} step={1} className={input} value={calculatorInputs.roofWastePct} onChange={(e) => handleInputChange('roofWastePct', e.target.value)} /></label>
                  </div>
                </div>
            )}
            <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
              <h3 className="font-medium text-slate-800 dark:text-slate-200">Material Yields</h3>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <label className="block"><span className={label}>Open-cell yield</span><input type="number" min={1} step={1} className={input} value={calculatorInputs.openCellYield} onChange={(e) => handleInputChange('openCellYield', e.target.value)} /><span className={small}>bf/set</span></label>
                <label className="block"><span className={label}>Closed-cell yield</span><input type="number" min={1} step={1} className={input} value={calculatorInputs.closedCellYield} onChange={(e) => handleInputChange('closedCellYield', e.target.value)} /><span className={small}>bf/set</span></label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${card} p-6`}>
          <h2 className={h2}>Additional Areas</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add other flat areas to include, like interior walls or attached flat roofs.</p>
          <div className="mt-4 space-y-3">
              {calculatorInputs.additionalSections.map((section) => (
                  <div key={section.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 sm:gap-2 items-end p-3 rounded-lg border bg-slate-50 dark:bg-slate-600/30 border-slate-200 dark:border-slate-500">
                      <label className="block"><span className={label}>Length (ft)</span><input type="number" min="0" value={section.length} onChange={e => handleSectionChange(section.id, 'length', e.target.value)} className={input} /></label>
                      <label className="block"><span className={label}>Width (ft)</span><input type="number" min="0" value={section.width} onChange={e => handleSectionChange(section.id, 'width', e.target.value)} className={input} /></label>
                      <label className="block"><span className={label}>Apply to</span><select value={section.type} onChange={e => handleSectionChange(section.id, 'type', e.target.value)} className={select}><option value="walls">Walls</option><option value="roof">Roof</option></select></label>
                      <button onClick={() => handleRemoveSection(section.id)} className="w-full sm:w-auto h-11 flex-shrink-0 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 px-3 font-mono font-bold text-lg" aria-label="Remove Section">-</button>
                  </div>
              ))}
          </div>
          <button onClick={handleAddSection} className="mt-3 rounded-lg bg-slate-100 dark:bg-slate-600 px-3 py-1.5 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-500">+ Add Area</button>
      </div>
      
      <div className={`${card} p-6`}>
        <h2 className={h2}>Additional Materials & Supplies</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add items from your inventory to this estimate.</p>
        <div className="mt-4 space-y-3">
          {calculatorInputs.inventoryLineItems.map(lineItem => {
            const selectedItem = inventoryItems.find(i => i.id === lineItem.itemId);
            const onHandQty = selectedItem ? selectedItem.quantity : 0;
            const isOver = lineItem.quantity > onHandQty;
            return (
              <div key={lineItem.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-3 sm:gap-2 items-end p-3 rounded-lg border bg-slate-50 dark:bg-slate-600/30 border-slate-200 dark:border-slate-500">
                <label className="block">
                  <span className={label}>Material</span>
                  <select
                    value={lineItem.itemId}
                    onChange={e => handleInventoryLineItemChange(lineItem.id, 'itemId', e.target.value)}
                    className={select}
                  >
                    <option value="">-- Select Item --</option>
                    {inventoryItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="block">
                   <span className={label}>Quantity Needed</span>
                  <input
                    type="number"
                    min="0"
                    value={lineItem.quantity}
                    onChange={e => handleInventoryLineItemChange(lineItem.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className={input}
                  />
                   {selectedItem && (
                    <span className={`text-xs ml-1 ${isOver ? 'text-red-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                      On Hand: {onHandQty}
                    </span>
                  )}
                </label>
                <button onClick={() => handleRemoveInventoryLineItem(lineItem.id)} className="w-full sm:w-auto h-11 flex-shrink-0 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 px-3 font-mono font-bold text-lg" aria-label="Remove Item">-</button>
              </div>
            )
          })}
        </div>
        <button onClick={handleAddInventoryLineItem} className="mt-3 rounded-lg bg-slate-100 dark:bg-slate-600 px-3 py-1.5 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-500">+ Add Material</button>
      </div>

      <div className={`${card} p-6`}>
        <h2 className="text-lg font-semibold tracking-tight text-center sm:text-left">Calculation Summary</h2>
        
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/40 p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{fmt(calc.totalSprayArea, 0)}</p>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider">Total Area (ft²)</p>
          </div>
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/40 p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{fmt(calc.totalBoardFeetWithWaste, 0)}</p>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider">Total Board Feet</p>
          </div>
          <div className="rounded-xl bg-green-50 dark:bg-green-900/40 p-3 border border-green-200 dark:border-green-800">
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">{calc.ocSets > 0 ? `${fmt(calc.ocSets, 2)}` : "0.00"}</p>
            <p className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider">Open-Cell Sets</p>
          </div>
          <div className="rounded-xl bg-green-50 dark:bg-green-900/40 p-3 border border-green-200 dark:border-green-800">
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">{calc.ccSets > 0 ? `${fmt(calc.ccSets, 2)}` : "0.00"}</p>
            <p className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider">Closed-Cell Sets</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3">
          <button onClick={copyResults} className="w-full rounded-lg bg-slate-200 dark:bg-slate-600 px-4 py-2.5 text-slate-800 dark:text-slate-100 font-medium shadow-sm hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Copy Details</button>
          <button onClick={handleProceedToCosting} disabled={!calc.pitchValid && calculatorInputs.calculatorType === 'building'} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white font-semibold shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-500 transition-colors">Proceed to Job Costing</button>
        </div>
        {!calc.pitchValid && calculatorInputs.calculatorType === 'building' && (<div className="mt-3 w-full rounded-lg bg-red-100 dark:bg-red-900/40 px-3 py-2 text-sm text-red-700 dark:text-red-200">Enter a valid roof pitch for the main building to proceed</div>)}

        <details className="mt-6 group">
          <summary className="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white list-none">
            <div className="flex items-center">
              <span>Show Calculation Breakdown</span>
              <svg className="w-4 h-4 ml-1 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-200 dark:border-slate-600 pt-3 text-sm">
              <div className="space-y-1">
                  <h3 className="font-semibold mb-1">Areas</h3>
                  <div className="flex justify-between"><span>Perimeter</span><span className="font-mono">{fmt(calc.perimeter)} ft</span></div>
                  <div className="flex justify-between"><span>Wall area (rectangles)</span><span className="font-mono">{fmt(calc.wallRectArea)} ft²</span></div>
                  <div className="flex justify-between"><span>Gable triangle add-on</span><span className="font-mono">{calculatorInputs.includeGableTriangles ? `${fmt(calc.gableAdd)} ft²` : "—"}</span></div>
                  <div className="flex justify-between font-medium"><span>Wall total</span><span className="font-mono">{fmt(calc.wallTotal)} ft²</span></div>
                  <div className="flex justify-between"><span>Roof slope factor</span><span className="font-mono">{calc.pitchValid ? fmt(calc.slopeFactor, 4) : "—"}</span></div>
                  <div className="flex justify-between font-medium"><span>Roof underside area</span><span className="font-mono">{fmt(calc.roofArea)} ft²</span></div>
              </div>
              <div className="space-y-1">
                  <h3 className="font-semibold mb-1">Board Feet & Yields</h3>
                  <div className="flex justify-between"><span>Wall Board Feet (+waste)</span><span className="font-mono">{fmt(calc.wallBoardFeetWithWaste, 0)} bf</span></div>
                  <div className="flex justify-between"><span>Roof Board Feet (+waste)</span><span className="font-mono">{fmt(calc.roofBoardFeetWithWaste, 0)} bf</span></div>
                  <div className="flex justify-between"><span>Total Board Feet (no waste)</span><span className="font-mono">{fmt(calc.totalBoardFeetBase, 0)} bf</span></div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-600"><span>Open-cell yield used</span><span className="font-mono">{calculatorInputs.openCellYield}</span></div>
                  <div className="flex justify-between"><span>Closed-cell yield used</span><span className="font-mono">{calculatorInputs.closedCellYield}</span></div>
              </div>
              <div className="col-span-1 md:col-span-2 mt-3 border-t border-slate-200 dark:border-slate-600 pt-3">
                <h3 className="font-semibold">Formula Notes</h3>
                <ul className="mt-1 list-inside list-disc text-xs text-slate-700 dark:text-slate-300">
                  <li>Wall rectangles: <code>Area = 2 × (L + W) × H</code></li>
                  <li>Gable add-on (2 ends): <code>Area = W × ((W/2) × (rise/run))</code></li>
                  <li>Roof slope factor: <code>sf = √(1 + (rise/run)^2)</code></li>
                  <li>Roof underside area: <code>Area = L × W × sf</code></li>
                </ul>
              </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Disclaimer: Board feet = ft² × inches. Yields are adjustable; consider job conditions. This tool is for quick estimating — verify measurements on site.</p>
        </details>
      </div>

    </div>
    </>
  );
}