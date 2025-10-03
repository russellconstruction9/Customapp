

import React, { useState } from 'react';
import { Page } from '../App.tsx';
import { db } from '../lib/db.ts';

interface MorePageProps {
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

// Helper function to convert array of objects to CSV string
const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    // Use a comprehensive set of headers from all objects
    // FIX: Explicitly type the accumulator for `reduce` to ensure `allKeys` becomes a `Set<string>`,
    // which prevents `header` from being inferred as `unknown` and causing a type error.
    const allKeys = data.reduce<Set<string>>((keys, obj) => {
        if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(key => keys.add(key));
        }
        return keys;
    }, new Set<string>());
    const headers = Array.from(allKeys);

    const csvRows = [headers.join(',')];

    for (const row of data) {
        const values = headers.map(header => {
            let value = row[header];
            if (value === null || value === undefined) {
                return '';
            }
            if (typeof value === 'object' && value !== null) {
                value = JSON.stringify(value);
            }
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};

// Helper function to trigger CSV download
const downloadCSV = (csvString: string, filename: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const MorePage: React.FC<MorePageProps> = ({ onNavigate, onLogout }) => {
  const [isExporting, setIsExporting] = useState(false);
  const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm";

  interface ListItemProps {
    page: Page;
    icon: React.ReactElement;
    title: string;
    description: string;
  }

  const handleExportData = async () => {
    setIsExporting(true);
    try {
        const customers = await db.customers.toArray();
        const jobs = await db.estimates.toArray();
        const inventory = await db.inventory.toArray();
        const employees = await db.employees.toArray();
        const tasks = await db.tasks.toArray();

        if (customers.length > 0) downloadCSV(convertToCSV(customers), 'customers.csv');
        await new Promise(r => setTimeout(r, 200));
        if (jobs.length > 0) downloadCSV(convertToCSV(jobs), 'jobs.csv');
        await new Promise(r => setTimeout(r, 200));
        if (inventory.length > 0) downloadCSV(convertToCSV(inventory), 'inventory.csv');
        await new Promise(r => setTimeout(r, 200));
        if (employees.length > 0) downloadCSV(convertToCSV(employees), 'employees.csv');
        await new Promise(r => setTimeout(r, 200));
        if (tasks.length > 0) downloadCSV(convertToCSV(tasks), 'tasks.csv');

    } catch (error) {
        console.error("Failed to export data", error);
        alert("An error occurred while exporting data.");
    } finally {
        setIsExporting(false);
    }
  };

  const ListItem: React.FC<ListItemProps> = ({ page, icon, title, description }) => (
    <button
      onClick={() => onNavigate(page)}
      className="w-full text-left p-4 flex items-center gap-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors"
    >
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-lg">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
       <div className="ml-auto text-slate-400 dark:text-slate-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
       </div>
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl p-4">
        <div className="mb-4">
            <h1 className="text-2xl font-bold dark:text-white">More Options</h1>
        </div>
      <div className={`${card} p-2`}>
        <div className="divide-y divide-slate-100 dark:divide-slate-600/50">
          <ListItem
            page="jobsList"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
            title="Jobs"
            description="View estimates, sold jobs, and invoices."
          />
           <ListItem
            page="automations"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 00.517 3.86l2.387.477a2 2 0 001.806.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 00-.517-3.86l-2.387-.477zM12 9a3 3 0 100-6 3 3 0 000 6z" /></svg>}
            title="Automations"
            description="Create workflows to automate tasks."
          />
          <ListItem
            page="team"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-3-5.197m0 0A4 4 0 0012 4.354m0 5.292a4 4 0 00-3 5.197" /></svg>}
            title="Team"
            description="Manage employees and access their time logs."
          />
           <ListItem
            page="timeclock"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="Time Clock"
            description="View team status and live locations on a map."
          />
           <ListItem
            page="materialOrder"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>}
            title="Materials"
            description="Track on-hand inventory and see what to order."
          />
           <ListItem
            page="inventory"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
            title="Inventory"
            description="Manage stock levels of foam, equipment, and supplies."
          />
          <ListItem
            page="gantt"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
            title="Gantt Chart"
            description="Visualize project timelines and dependencies."
          />
          <ListItem
            page="settings"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            title="Settings"
            description="Configure company details, defaults, and appearance."
          />
        </div>
      </div>
       <div className={`${card} mt-4`}>
          <div className="p-4 flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Sync to Cloud</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Export data to CSV files for backup or use in Google Sheets.</p>
              </div>
              <button
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="ml-auto flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-semibold shadow hover:bg-blue-700 disabled:bg-slate-400"
              >
                  {isExporting ? 'Exporting...' : 'Export All'}
              </button>
          </div>
      </div>

       <div className={`${card} mt-4`}>
          <button
            onClick={onLogout}
            className="w-full text-left p-4 flex items-center gap-4 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-300 rounded-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-red-600 dark:text-red-400">Logout</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sign out of the application.</p>
            </div>
          </button>
        </div>
    </div>
  );
};

export default MorePage;