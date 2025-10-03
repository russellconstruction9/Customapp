import React, { useMemo } from 'react';
import { EstimateRecord, JobStatus } from '../lib/db.ts';
import { CustomerInfo } from './EstimatePDF.tsx';

interface JobsListProps {
  jobs: EstimateRecord[];
  customers: CustomerInfo[];
  onViewJob: (job: EstimateRecord) => void;
  onDeleteJob: (jobId: number) => void;
  filter: JobStatus | 'all';
  setFilter: (filter: JobStatus | 'all') => void;
}

const getStatusBadge = (status: JobStatus) => {
  switch (status) {
    case 'estimate':
      return <span className="text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2.5 py-1 rounded-full">Estimate</span>;
    case 'sold':
      return <span className="text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-2.5 py-1 rounded-full">Sold</span>;
    case 'invoiced':
      return <span className="text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200 px-2.5 py-1 rounded-full">Invoiced</span>;
    case 'paid':
      return <span className="text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2.5 py-1 rounded-full">Paid</span>;
    default:
      return null;
  }
};

const JobsList: React.FC<JobsListProps> = ({ jobs, customers, onViewJob, onDeleteJob, filter, setFilter }) => {
  const findCustomer = (customerId: number) => customers.find(c => c.id === customerId);

  const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm";

  const filteredJobs = useMemo(() => {
    if (filter === 'all') {
      return jobs;
    }
    return jobs.filter(job => job.status === filter);
  }, [jobs, filter]);

  const handleDeleteClick = (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation(); // Prevent navigation to job detail page
    onDeleteJob(jobId);
  };
  
  const FilterButton: React.FC<{
    status: JobStatus | 'all';
    label: string;
    currentFilter: JobStatus | 'all';
    onClick: (status: JobStatus | 'all') => void;
  }> = ({ status, label, currentFilter, onClick }) => {
    const isActive = status === currentFilter;
    return (
      <button
        onClick={() => onClick(status)}
        className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-500'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex flex-wrap gap-2">
          <FilterButton status="all" label="All" currentFilter={filter} onClick={setFilter} />
          <FilterButton status="estimate" label="Estimates" currentFilter={filter} onClick={setFilter} />
          <FilterButton status="sold" label="Sold" currentFilter={filter} onClick={setFilter} />
          <FilterButton status="invoiced" label="Invoiced" currentFilter={filter} onClick={setFilter} />
          <FilterButton status="paid" label="Paid" currentFilter={filter} onClick={setFilter} />
      </div>
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <div className={`${card} text-sm text-slate-500 dark:text-slate-400 py-8 text-center`}>
            No jobs match the current filter.
          </div>
        ) : (
          filteredJobs.map(job => {
            const customer = findCustomer(job.customerId);
            return (
              <div key={job.id} className="group relative">
                <button onClick={() => onViewJob(job)} className={`${card} w-full text-left p-4 transition-all duration-200 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500`}>
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">{customer?.name || 'Unknown Customer'}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{job.estimateNumber} &bull; {new Date(job.createdAt).toLocaleDateString()}</p>
                       <p className="text-base font-bold text-slate-800 dark:text-slate-50 sm:hidden mt-1">
                         {job.costsData?.finalQuote.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0.00'}
                       </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-3">
                       <span className="text-lg font-bold text-slate-800 dark:text-slate-50 hidden sm:block">
                         {job.costsData?.finalQuote.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0.00'}
                       </span>
                       {getStatusBadge(job.status)}
                    </div>
                  </div>
                </button>
                <button 
                    onClick={(e) => handleDeleteClick(e, job.id!)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-full text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-300 focus:opacity-100 transition-all"
                    aria-label={`Delete job ${job.estimateNumber}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default JobsList;