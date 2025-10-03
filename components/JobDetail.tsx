
import React, { useState, useEffect } from 'react';
import { EstimateRecord, JobStatus, getTimeEntriesForJob } from '../lib/db.ts';
import { CustomerInfo } from './EstimatePDF.tsx';
import { Employee, TimeEntry } from './types.ts';

interface JobDetailProps {
    job: EstimateRecord;
    customers: CustomerInfo[];
    employees: Employee[];
    onBack: () => void;
    onUpdateJob: (jobId: number, updates: Partial<EstimateRecord>) => void;
    onPrepareInvoice: (job: EstimateRecord) => void;
    onScheduleJob: (job: EstimateRecord) => void;
    onViewCustomer: (customerId: number) => void;
}

const fmt = (n: number, digits = 2) => n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
const fmtCurrency = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// Simple markdown renderer for displaying the scope
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

const JobWorkflowStepper: React.FC<{ status: JobStatus, onSetStatus: (newStatus: JobStatus) => void }> = ({ status, onSetStatus }) => {
    const steps: JobStatus[] = ['estimate', 'sold', 'invoiced', 'paid'];
    const currentStepIndex = steps.indexOf(status);

    return (
        <div className="w-full px-2 sm:px-4">
            <div className="flex items-center">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const isClickable = index <= currentStepIndex + 1 || (status === 'paid' && index === steps.length -1);

                    return (
                        <React.Fragment key={step}>
                            <button
                                disabled={!isClickable}
                                onClick={() => isClickable && onSetStatus(step)}
                                className="flex flex-col items-center relative"
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                    ${isCompleted ? 'bg-blue-600 text-white' : ''}
                                    ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-500/50' : ''}
                                    ${!isCompleted && !isCurrent ? 'bg-slate-200 dark:bg-slate-500 text-slate-500 dark:text-slate-300' : ''}
                                `}>
                                    {isCompleted ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </div>
                                <span className={`mt-2 text-xs font-semibold text-center absolute top-full whitespace-nowrap transition-colors
                                    ${isCurrent || isCompleted ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}
                                `}>{step.charAt(0).toUpperCase() + step.slice(1)}</span>
                            </button>
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-1 mx-2 rounded-full transition-colors ${isCompleted ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-500'}`}></div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};


const JobDetail: React.FC<JobDetailProps> = ({ job, customers, employees, onBack, onUpdateJob, onPrepareInvoice, onScheduleJob, onViewCustomer }) => {
    const customer = customers.find(c => c.id === job.customerId);
    const { calcData, costsData, status } = job;
    
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [timeLog, setTimeLog] = useState<TimeEntry[]>([]);
    const [isLoadingLog, setIsLoadingLog] = useState(true);
    const [isEditingScope, setIsEditingScope] = useState(false);
    const [editedScope, setEditedScope] = useState(job.scopeOfWork || '');

    useEffect(() => {
        if (job.id) {
            setIsLoadingLog(true);
            getTimeEntriesForJob(job.id)
                .then(log => setTimeLog(log.sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())))
                .catch(console.error)
                .finally(() => setIsLoadingLog(false));
        }
        setEditedScope(job.scopeOfWork || '');
    }, [job]);
    
    const handleScopeSave = () => {
        onUpdateJob(job.id!, { scopeOfWork: editedScope });
        setIsEditingScope(false);
    };

    const handleViewPdf = (pdfBlob: Blob) => {
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
    };
    
    const getEmployeeName = (employeeId: number) => {
        return employees.find(e => e.id === employeeId)?.name || `Employee #${employeeId}`;
    };

    const totalTrackedHours = timeLog.reduce((sum, entry) => sum + (entry.durationHours || 0), 0);
    
    const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm p-6";
    const h2 = "text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100";
    const label = "text-sm font-medium text-slate-500 dark:text-slate-400";
    const value = "text-base font-semibold text-slate-800 dark:text-slate-100";

    if (!calcData || !costsData) {
        return (
            <div className="mx-auto max-w-3xl p-4">
                <button onClick={onBack} className="mb-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">&larr; Back to Jobs List</button>
                <div className={`${card} text-center`}>
                    <h2 className="text-red-600 font-semibold">Error</h2>
                    <p>This job record is missing calculation or cost data.</p>
                </div>
            </div>
        )
    }

    const renderWorkflowAction = () => {
        const baseButtonClass = "w-full sm:w-auto rounded-lg px-6 py-3 text-base text-white font-semibold shadow-sm transition-colors flex-grow sm:flex-grow-0";
        switch (status) {
            case 'estimate':
                return <button onClick={() => onUpdateJob(job.id!, { status: 'sold' })} className={`${baseButtonClass} bg-blue-600 hover:bg-blue-700`}>Mark as Sold</button>;
            case 'sold':
                return <button onClick={() => onPrepareInvoice(job)} className={`${baseButtonClass} bg-green-600 hover:bg-green-700`}>Prepare Invoice</button>;
            case 'invoiced':
                return <button onClick={() => setIsPaymentModalOpen(true)} className={`${baseButtonClass} bg-indigo-600 hover:bg-indigo-700`}>Record Payment</button>;
            case 'paid':
                return <div className="text-center sm:text-left text-lg font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Job Complete & Paid
                </div>;
        }
    };

    return (
         <div className="mx-auto max-w-3xl p-4 space-y-4">
            <button onClick={onBack} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">&larr; Back to Jobs List</button>
            
            <div className={card}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        {customer ? (
                            <button onClick={() => onViewCustomer(customer.id)} className="text-left group">
                                <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 group-hover:underline">{customer.name}</h1>
                            </button>
                        ) : (
                            <h1 className="text-2xl font-bold dark:text-white">Unknown Customer</h1>
                        )}
                        <p className="text-sm text-slate-500 dark:text-slate-400">{job.estimateNumber} &bull; Created {new Date(job.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div className="mb-8 pt-4">
                     <JobWorkflowStepper status={status} onSetStatus={(newStatus) => onUpdateJob(job.id!, { status: newStatus })} />
                </div>
                
                <div className="mt-4 pt-6 border-t border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-4">
                    {renderWorkflowAction()}
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                        <button onClick={() => onScheduleJob(job)} className="rounded-lg bg-slate-100 dark:bg-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-200 dark:hover:bg-slate-500">Schedule</button>
                        <button onClick={() => handleViewPdf(job.estimatePdf)} className="rounded-lg bg-slate-100 dark:bg-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-200 dark:hover:bg-slate-500">Estimate PDF</button>
                        {(status === 'invoiced' || status === 'paid') && job.invoicePdf && (
                           <button onClick={() => handleViewPdf(job.invoicePdf!)} className="rounded-lg bg-slate-100 dark:bg-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-200 dark:hover:bg-slate-500">Invoice PDF</button>
                        )}
                        <button onClick={() => handleViewPdf(job.materialOrderPdf)} className="rounded-lg bg-slate-100 dark:bg-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-200 dark:hover:bg-slate-500">Materials PDF</button>
                    </div>
                </div>
            </div>

            <div className={`${card} grid grid-cols-1 md:grid-cols-2 gap-6`}>
                <div>
                    <h2 className={h2}>Job Totals</h2>
                    <div className="mt-3 space-y-2">
                        <div className="flex justify-between"><span className={label}>Final Quote</span><span className={value}>{fmtCurrency(costsData.finalQuote)}</span></div>
                        <div className="flex justify-between"><span className={label}>Total Area</span><span className={value}>{fmt(calcData.totalSprayArea, 0)} ft²</span></div>
                        <div className="flex justify-between"><span className={label}>Total Board Feet</span><span className={value}>{fmt(calcData.totalBoardFeetWithWaste, 0)} bf</span></div>
                        <div className="flex justify-between pt-2 mt-2 border-t border-slate-200 dark:border-slate-600"><span className={label}>Open-Cell Sets</span><span className={value}>{fmt(calcData.ocSets, 2)}</span></div>
                        <div className="flex justify-between"><span className={label}>Closed-Cell Sets</span><span className={value}>{fmt(calcData.ccSets, 2)}</span></div>
                    </div>
                </div>
                 <div>
                    <h2 className={h2}>Cost Breakdown</h2>
                    <div className="mt-3 space-y-2">
                        <div className="flex justify-between"><span className={label}>Material Cost</span><span className={value}>{fmtCurrency(costsData.totalMaterialCost)}</span></div>
                        <div className="flex justify-between"><span className={label}>Labor & Equipment</span><span className={value}>{fmtCurrency(costsData.laborAndEquipmentCost)}</span></div>
                        <div className="flex justify-between"><span className={label}>Additional Items</span><span className={value}>{fmtCurrency(costsData.additionalCostsTotal)}</span></div>
                        <div className="flex justify-between pt-2 mt-2 border-t border-slate-200 dark:border-slate-600"><span className={label}>Subtotal</span><span className={value}>{fmtCurrency(costsData.subtotal)}</span></div>
                        <div className="flex justify-between"><span className={label}>Overhead</span><span className={value}>{fmtCurrency(costsData.overheadValue)}</span></div>
                        <div className="flex justify-between"><span className={label}>Tax</span><span className={value}>{fmtCurrency(costsData.taxValue)}</span></div>
                    </div>
                </div>
            </div>

            <div className={card}>
                <div className="flex justify-between items-center">
                    <h2 className={h2}>Scope of Work / Description</h2>
                    {!isEditingScope && (
                        <button 
                            onClick={() => setIsEditingScope(true)} 
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Edit
                        </button>
                    )}
                </div>
                <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 space-y-2 border-t border-slate-200 dark:border-slate-600 pt-3">
                    {isEditingScope ? (
                        <>
                            <textarea
                                className="w-full h-48 p-2 border rounded-md bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={editedScope}
                                onChange={(e) => setEditedScope(e.target.value)}
                                placeholder="Enter job description or scope details..."
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => { setIsEditingScope(false); setEditedScope(job.scopeOfWork || ''); }} className="px-4 py-2 rounded-lg text-sm bg-slate-200 dark:bg-slate-500 hover:bg-slate-300 dark:hover:bg-slate-400">Cancel</button>
                                <button onClick={handleScopeSave} className="px-4 py-2 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-700">Save Description</button>
                            </div>
                        </>
                    ) : (
                        job.scopeOfWork ? renderScopeForDisplay(job.scopeOfWork) : <p className="text-slate-500 dark:text-slate-400 italic">No description provided. Click 'Edit' to add one.</p>
                    )}
                </div>
            </div>
            
            <div className={card}>
                <h2 className={h2}>Time Log</h2>
                {isLoadingLog ? <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading time entries...</p> : (
                    timeLog.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">No time has been logged for this job yet.</p> : (
                        <div className="mt-3 flow-root">
                            <div className="-mx-6 -my-2 overflow-x-auto">
                                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
                                        <thead>
                                            <tr>
                                                <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold">Employee</th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Clock In</th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Clock Out</th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {timeLog.map(entry => (
                                                <tr key={entry.id}>
                                                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium">{getEmployeeName(entry.employeeId)}</td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                        {new Date(entry.startTime).toLocaleString()}
                                                        {entry.startLat && <a href={`https://www.google.com/maps?q=${entry.startLat},${entry.startLng}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline text-xs">(Map)</a>}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                        {entry.endTime ? new Date(entry.endTime).toLocaleString() : 'Still Clocked In'}
                                                        {entry.endLat && <a href={`https://www.google.com/maps?q=${entry.endLat},${entry.endLng}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline text-xs">(Map)</a>}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold">{entry.durationHours ? `${entry.durationHours.toFixed(2)} hrs` : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={3} className="pt-3 text-right font-bold pr-3 border-t-2 border-slate-300 dark:border-slate-500">Total Hours:</td>
                                                <td className="pt-3 font-bold border-t-2 border-slate-300 dark:border-slate-500">{totalTrackedHours.toFixed(2)} hrs</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>

            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" aria-modal="true" role="dialog">
                    <div className="relative w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl">
                         <button onClick={() => setIsPaymentModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="Close modal">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-xl font-bold dark:text-white">Record Payment</h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            Mark this invoice of <strong className="dark:text-white">{fmtCurrency(costsData.finalQuote)}</strong> as paid?
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                            <button 
                                type="button" 
                                onClick={() => {
                                    onUpdateJob(job.id!, { status: 'paid' });
                                    setIsPaymentModalOpen(false);
                                }}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700">Confirm Payment</button>
                        </div>
                    </div>
                </div>
            )}
         </div>
    );
};

export default JobDetail;