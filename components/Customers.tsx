

import React, { useState, useEffect } from 'react';
import { CustomerInfo } from './EstimatePDF.tsx';
import { getEstimatesForCustomer } from '../lib/db.ts';
import MapView from './MapView.tsx';

interface CustomersProps {
  customers: CustomerInfo[];
  onAddCustomer: (customer: Omit<CustomerInfo, 'id'>) => void;
  onViewCustomer: (customerId: number) => void;
  onUpdateCustomer: (customer: CustomerInfo) => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, onAddCustomer, onViewCustomer, onUpdateCustomer }) => {
  const [customerActivity, setCustomerActivity] = useState<Record<number, number>>({});
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [view, setView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoadingActivity(true);
      const activityMap: Record<number, number> = {};
      
      await Promise.all(customers.map(async (customer) => {
        try {
          const estimates = await getEstimatesForCustomer(customer.id);
          activityMap[customer.id] = estimates.length;
        } catch (e) {
          console.error(`Failed to get estimates for customer ${customer.id}`, e);
          activityMap[customer.id] = 0;
        }
      }));

      setCustomerActivity(activityMap);
      setIsLoadingActivity(false);
    };

    if (customers.length > 0) {
      fetchActivity();
    } else {
      setIsLoadingActivity(false);
    }
  }, [customers]);

  const card = "rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm";
  
  // FIX: Changed JSX.Element to React.ReactElement to resolve a namespace error.
  const ViewToggleButton: React.FC<{target: 'list' | 'map', label: string, icon: React.ReactElement}> = ({ target, label, icon }) => {
    const isActive = view === target;
    return (
        <button 
            onClick={() => setView(target)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-500/50'
            }`}
        >
            {icon}
            {label}
        </button>
    );
  };

  return (
    <>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark:text-white">Customer Management</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            View your existing client list or switch to a map view.
          </p>
        </div>

        <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-900/50 rounded-lg">
                <ViewToggleButton 
                    target="list" 
                    label="List" 
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>} 
                />
                 <ViewToggleButton 
                    target="map" 
                    label="Map" 
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                />
            </div>
        </div>

        {view === 'list' ? (
          <div className={`${card} p-4`}>
            <div className="space-y-3">
              {customers.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No customers added yet.</p>
              ) : (
                [...customers].sort((a, b) => a.name.localeCompare(b.name)).map(customer => {
                  const activityCount = customerActivity[customer.id];
                  return (
                    <div key={customer.id} className="border rounded-lg bg-slate-50/50 dark:bg-slate-700/30 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors flex items-center justify-between p-3 gap-4">
                        <div onClick={() => onViewCustomer(customer.id)} className="flex-grow cursor-pointer group">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">{customer.name}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{customer.address}</p>
                            <div className="flex items-center gap-4 mt-1">
                                <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{customer.phone}{customer.phone && customer.email && ' | '}{customer.email}</p>
                                {!isLoadingActivity && activityCount > 0 && (
                                   <span className="flex-shrink-0 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                     {activityCount} saved file{activityCount > 1 ? 's' : ''}
                                   </span>
                                )}
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            {customer.address && (
                                <a 
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customer.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors block"
                                    aria-label={`Get directions to ${customer.name}`}
                                    title="Get Directions"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </a>
                            )}
                        </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
           <div className={`${card} p-1 overflow-hidden h-[70vh] min-h-[500px]`}>
              <MapView customers={customers} onUpdateCustomer={onUpdateCustomer} />
           </div>
        )}
      </div>
    </>
  );
};

export default Customers;