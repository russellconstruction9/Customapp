

import React, { useMemo } from 'react';
import { EstimateRecord } from '../lib/db.ts';
import { CompanyInfo, CustomerInfo } from './EstimatePDF.tsx';

interface InvoicingProps {
    soldJobs: EstimateRecord[];
    customers: CustomerInfo[];
    companyInfo: CompanyInfo;
    onPrepareInvoice: (job: EstimateRecord) => void;
}

const Invoicing: React.FC<InvoicingProps> = ({ soldJobs, customers, onPrepareInvoice }) => {

    const { pending, invoiced } = useMemo(() => {
        const pending: EstimateRecord[] = [];
        const invoiced: EstimateRecord[] = [];
        soldJobs.forEach(job => {
            if (job.status === 'invoiced') {
                invoiced.push(job);
            } else {
                pending.push(job);
            }
        });
        // Sort pending newest first
        pending.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Sort invoiced newest first
        invoiced.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return { pending, invoiced };
    }, [soldJobs]);

    const findCustomer = (customerId: number) => {
        return customers.find(c => c.id === customerId);
    };

    const card = "rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm p-4";
    const h2 = "text-xl font-semibold tracking-tight dark:text-white";
    
    // FIX: Changed component definition to React.FC to correctly type props and handle the 'key' prop.
    const JobCard: React.FC<{ job: EstimateRecord }> = ({ job }) => {
        const customer = findCustomer(job.customerId);

        return (
             <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 dark:bg-slate-800 p-4 rounded-lg shadow-sm border dark:border-slate-700">
                <div className="mb-2 sm:mb-0">
                    <p className="font-semibold text-gray-800 dark:text-slate-100">{customer?.name || 'Unknown Customer'}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        Job #: {job.estimateNumber} | Date Sold: {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {job.costsData?.finalQuote.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </p>
                </div>
                {job.status !== 'invoiced' && (
                    <button 
                        onClick={() => onPrepareInvoice(job)} 
                        className="w-full sm:w-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                        Prepare Invoice
                    </button>
                )}
            </li>
        )
    };

    return (
        <>
            <div className="mx-auto max-w-4xl p-4 sm:p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold dark:text-white">Customer Invoicing</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                        Generate and manage invoices for all completed jobs.
                    </p>
                </div>
                
                <div className="space-y-6">
                    {/* Pending Invoices */}
                    <div className={card}>
                        <h2 className={h2}>Pending Invoice ({pending.length})</h2>
                        {pending.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-3 p-3">No jobs are currently waiting for an invoice.</p>
                        ) : (
                            <ul className="mt-4 space-y-3">
                                {pending.map(job => <JobCard key={job.id} job={job} />)}
                            </ul>
                        )}
                    </div>

                    {/* Completed Invoices */}
                    <div className={card}>
                        <h2 className={h2}>Completed Invoices ({invoiced.length})</h2>
                         {invoiced.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-3 p-3">No invoices have been generated yet.</p>
                        ) : (
                            <ul className="mt-4 space-y-3">
                                {invoiced.map(job => (
                                    <li key={job.id} className="flex justify-between items-center bg-green-50/50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700 opacity-80">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-slate-100">{findCustomer(job.customerId)?.name || 'Unknown'}</p>
                                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                                Job #: {job.estimateNumber} | Total: {job.costsData?.finalQuote.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-green-600 dark:text-green-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            <span className="text-sm font-semibold">Invoiced</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Invoicing;
