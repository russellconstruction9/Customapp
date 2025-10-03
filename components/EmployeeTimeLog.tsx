
import React, { useState, useEffect } from 'react';
import { Employee, TimeEntry } from './types.ts';
import { db } from '../lib/db.ts';

interface EmployeeTimeLogProps {
    employee: Employee;
}

const EmployeeTimeLog: React.FC<EmployeeTimeLogProps> = ({ employee }) => {
    const [timeLog, setTimeLog] = useState<TimeEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (employee.id) {
            setIsLoading(true);
            db.time_log.where('employeeId').equals(employee.id).reverse().toArray()
                .then(setTimeLog)
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [employee]);

    if (isLoading) return <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading log...</p>;
    if (timeLog.length === 0) return <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No time entries found for {employee.name}.</p>;

    return (
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {timeLog.map(entry => (
                <div key={entry.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-600/50 border border-slate-200 dark:border-slate-600 text-xs">
                    <p><strong>Job:</strong> {entry.jobId}</p>
                    <p><strong>In:</strong> {new Date(entry.startTime).toLocaleString()}</p>
                    <p><strong>Out:</strong> {entry.endTime ? new Date(entry.endTime).toLocaleString() : 'Active'}</p>
                    {entry.durationHours && <p><strong>Duration:</strong> {entry.durationHours.toFixed(2)} hrs</p>}
                </div>
            ))}
        </div>
    );
};

export default EmployeeTimeLog;
