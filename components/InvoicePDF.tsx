

import React from 'react';
import type { CalculationResults } from './SprayFoamCalculator';
import type { Costs, CompanyInfo, CustomerInfo } from './EstimatePDF';

function fmtCurrency(n: number | undefined) {
  if (n === undefined || Number.isNaN(n) || !Number.isFinite(n)) return "$0.00";
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

interface InvoicePDFProps {
  calc: Omit<CalculationResults, 'customer'>;
  costs: Costs;
  companyInfo: CompanyInfo;
  customerInfo: CustomerInfo;
  invoiceNumber: string;
  scopeOfWork: string;
  pdfWidth: string;
  pdfHeight: string;
}

// Simple markdown-to-HTML parser for the scope of work
const renderScope = (text: string) => {
    const elements = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map((line, index) => {
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-4 list-disc">{line.substring(2)}</li>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <h4 key={index} className="font-semibold mt-2">{line.substring(2, line.length - 2)}</h4>;
        }
        return <p key={index}>{line}</p>;
      });

    return elements.reduce((acc, el) => {
      if (el.type === 'li') {
        const lastElement = acc[acc.length - 1];
        // If the last element is already a <ul>, we append the new <li> to its children
        if (lastElement && lastElement.type === 'ul') {
          // Since props are immutable, we create a new element by cloning
          // FIX: Cast lastElement.props to any to access children property and resolve type error.
          const newChildren = Array.isArray((lastElement.props as any).children)
            ? [...(lastElement.props as any).children, el]
            : [(lastElement.props as any).children, el];

          // Replace the last element with the new one
          acc[acc.length - 1] = React.cloneElement(lastElement, lastElement.props, newChildren);
        } else {
          // Otherwise, create a new <ul> and add the first <li>
          acc.push(<ul key={`ul-${el.key}`} className="space-y-1">{el}</ul>);
        }
      } else {
        // If it's not a list item, just push it
        acc.push(el);
      }
      return acc;
      // FIX: Changed JSX.Element[] to React.ReactElement[] to resolve a namespace error.
    }, [] as React.ReactElement[]);
};


const InvoicePDF: React.FC<InvoicePDFProps> = ({ calc, costs, companyInfo, customerInfo, invoiceNumber, scopeOfWork, pdfWidth, pdfHeight }) => {
  const today = new Date().toLocaleDateString();

  return (
    <div style={{ width: pdfWidth, height: pdfHeight }} className="bg-white text-slate-800 font-sans p-[0.75in] text-[10pt] flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-start pb-6 mb-6 border-b-2 border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{companyInfo.name}</h1>
          <p className="text-sm">{companyInfo.address}</p>
          <p className="text-sm">P: {companyInfo.phone} | E: {companyInfo.email}</p>
        </div>
        <div className="text-right">
            <h2 className="text-4xl font-bold text-slate-700 tracking-tight">INVOICE</h2>
            <p className="mt-2 text-sm">
                <span className="font-semibold text-slate-600">Invoice #: </span>
                {invoiceNumber}
            </p>
            <p className="text-sm">
                <span className="font-semibold text-slate-600">Date: </span>
                {today}
            </p>
        </div>
      </header>

      {/* Customer Info */}
      <section className="mb-8 grid grid-cols-2 gap-8">
        <div>
            <h3 className="font-semibold text-slate-500 text-sm tracking-wider uppercase mb-2">Bill To</h3>
            <p className="font-bold text-lg text-slate-800">{customerInfo.name}</p>
            <p>{customerInfo.address}</p>
        </div>
         <div className="text-right bg-slate-50 p-3 rounded-md">
            <h3 className="font-semibold text-slate-500 text-sm tracking-wider uppercase mb-1">Payment Terms</h3>
            <p className="font-bold text-base text-slate-800">Due Upon Receipt</p>
             <h3 className="font-semibold text-slate-500 text-sm tracking-wider uppercase mt-3 mb-1">Amount Due</h3>
            <p className="font-bold text-3xl text-slate-900">{fmtCurrency(costs.finalQuote)}</p>
        </div>
      </section>
      
      {/* Scope of Work */}
      <section className="mb-4">
        <h3 className="font-semibold text-slate-500 text-sm tracking-wider uppercase mb-2">Description of Services</h3>
        <div className="text-slate-700 leading-relaxed text-sm">
          {scopeOfWork ? renderScope(scopeOfWork) : <p>General spray foam insulation services.</p>}
        </div>
      </section>

      {/* Line Items Table */}
      <section className="flex-grow">
        <table className="w-full text-sm">
            <thead className="border-b-2 border-slate-300">
                <tr className="text-left text-slate-600">
                    <th className="font-semibold uppercase tracking-wider py-2">Cost Summary</th>
                    <th className="font-semibold uppercase tracking-wider py-2 text-right">Amount</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
                {costs.totalMaterialCost > 0 && (
                    <tr>
                        <td className="py-2">Spray Foam Materials (Open & Closed Cell)</td>
                        <td className="py-2 text-right">{fmtCurrency(costs.totalMaterialCost)}</td>
                    </tr>
                )}
                 {costs.totalInventoryCost > 0 && (
                    <tr>
                        <td className="py-2">Additional Materials & Supplies</td>
                        <td className="py-2 text-right">{fmtCurrency(costs.totalInventoryCost)}</td>
                    </tr>
                )}
                {costs.laborAndEquipmentCost > 0 && (
                     <tr>
                        <td className="py-2">Labor & Equipment</td>
                        <td className="py-2 text-right">{fmtCurrency(costs.laborAndEquipmentCost)}</td>
                    </tr>
                )}
                {costs.additionalCostsTotal > 0 && (
                     <tr>
                        <td className="py-2">Additional Line Items</td>
                        <td className="py-2 text-right">{fmtCurrency(costs.additionalCostsTotal)}</td>
                    </tr>
                )}
                {costs.overheadValue > 0 && (
                     <tr>
                        <td className="py-2">Overhead / Contingency</td>
                        <td className="py-2 text-right">{fmtCurrency(costs.overheadValue)}</td>
                    </tr>
                )}
                {costs.taxValue > 0 && (
                     <tr>
                        <td className="py-2">Sales Tax</td>
                        <td className="py-2 text-right">{fmtCurrency(costs.taxValue)}</td>
                    </tr>
                )}
            </tbody>
        </table>
      </section>
      
      {/* Total Amount */}
      <section className="mt-auto pt-4 border-t-2 border-slate-800">
        <div className="w-2/5 ml-auto text-right space-y-2">
            <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{fmtCurrency(costs.finalQuote)}</span>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-6 mt-6 text-xs text-slate-500 border-t border-slate-200">
        <h4 className="font-semibold mb-1 text-slate-600">Remit Payment To:</h4>
        <p>{companyInfo.name}<br/>{companyInfo.address}</p>
        <p className="mt-4 text-center font-semibold text-slate-700">Thank you for your business!</p>
      </footer>
    </div>
  );
};

export default InvoicePDF;
