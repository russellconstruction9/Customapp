import React from 'react';
import type { CalculationResults } from './SprayFoamCalculator.tsx';
import type { Costs, CompanyInfo, CustomerInfo } from './EstimatePDF.tsx';

// Utility functions for formatting
function fmt(n: number | undefined, digits = 2) {
  if (n === undefined || Number.isNaN(n) || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

interface MaterialOrderPDFProps {
  calc: Omit<CalculationResults, 'customer'>;
  costs: Costs;
  companyInfo: CompanyInfo;
  customerInfo: CustomerInfo;
  orderNumber: string;
}

const MaterialOrderPDF: React.FC<MaterialOrderPDFProps> = ({
  calc,
  costs,
  companyInfo,
  customerInfo,
  orderNumber
}) => {
  const today = new Date().toLocaleDateString();

  return (
    <div className="bg-white text-slate-800 font-sans w-[8.5in] h-[11in] p-[0.75in] text-[10pt] flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-start pb-4 mb-4 border-b-2 border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{companyInfo.name}</h1>
          <p className="text-sm">{companyInfo.address}</p>
        </div>
        <div className="text-right">
            <h2 className="text-3xl font-bold text-slate-700 tracking-tight">MATERIAL ORDER</h2>
            <p className="mt-1 text-sm">
                <span className="font-semibold text-slate-600">Order #: </span>
                {orderNumber}
            </p>
            <p className="text-sm">
                <span className="font-semibold text-slate-600">Date: </span>
                {today}
            </p>
        </div>
      </header>
      
      {/* Customer/Job Info */}
      <section className="mb-6">
        <h3 className="font-semibold text-slate-500 text-sm tracking-wider uppercase mb-2">Job Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm p-4 border rounded-lg bg-slate-50">
            <div>
                <p className="font-bold text-base">{customerInfo.name}</p>
                <p>{customerInfo.address}</p>
            </div>
             <div className="text-right">
                <p><span className="font-semibold">Total Area:</span> {fmt(calc.totalSprayArea, 0)} ft²</p>
                <p><span className="font-semibold">Board Feet:</span> {fmt(calc.totalBoardFeetWithWaste, 0)} bf</p>
            </div>
        </div>
      </section>

      {/* Required Materials */}
      <section className="flex-grow">
        <h3 className="text-xl font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">Required Materials</h3>
        <table className="w-full text-sm">
            <thead className="border-b-2 border-slate-300">
                <tr className="text-left text-slate-600">
                    <th className="font-semibold uppercase tracking-wider py-2">Material Type</th>
                    <th className="font-semibold uppercase tracking-wider py-2 text-center">Board Feet Needed</th>
                    <th className="font-semibold uppercase tracking-wider py-2 text-right">Sets Required</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
                {calc.ocSets > 0 && (
                    <tr className="font-medium">
                        <td className="py-3">Open-Cell Spray Foam</td>
                        <td className="py-3 text-center">{fmt(calc.totalOpenCellBoardFeet, 0)} bf</td>
                        <td className="py-3 text-right font-bold text-lg">{fmt(calc.ocSets, 2)} sets</td>
                    </tr>
                )}
                {calc.ccSets > 0 && (
                     <tr className="font-medium">
                        <td className="py-3">Closed-Cell Spray Foam</td>
                        <td className="py-3 text-center">{fmt(calc.totalClosedCellBoardFeet, 0)} bf</td>
                        <td className="py-3 text-right font-bold text-lg">{fmt(calc.ccSets, 2)} sets</td>
                    </tr>
                )}
            </tbody>
        </table>

        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <h4 className="font-bold">Notes for Warehouse/Supplier:</h4>
            <ul className="list-disc list-inside mt-2">
                <li>Please prepare the specified number of sets for the upcoming job for {customerInfo.name}.</li>
                <li>Yields used for this calculation are based on the original job estimate.</li>
                <li>Verify on-hand inventory before placing new orders.</li>
            </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto pt-4 text-xs text-slate-500 border-t border-slate-200 text-center">
        <p>This is an internal document for material planning and procurement. Not for customer distribution.</p>
        <p className="font-semibold">{companyInfo.name}</p>
      </footer>
    </div>
  );
};

export default MaterialOrderPDF;