
import React, { useState } from 'react';
import { Employee } from './types.ts';
import { EstimateRecord } from '../lib/db.ts';
import Employees from './Employees.tsx';
import EmployeeTimeLog from './EmployeeTimeLog.tsx';

interface TeamPageProps {
  employees: Employee[];
  onAddEmployee: (employee: Omit<Employee, 'id'>) => Promise<Employee>;
  jobs: EstimateRecord[];
}

const TeamPage: React.FC<TeamPageProps> = ({ employees, onAddEmployee, jobs }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm p-6";
  const h2 = "text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100";

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={card}>
          <h2 className={h2}>Team Members</h2>
          <Employees
            employees={employees}
            onAddEmployee={onAddEmployee}
            onSelectEmployee={setSelectedEmployee}
            selectedEmployeeId={selectedEmployee?.id}
          />
        </div>
        <div className={card}>
          <h2 className={h2}>Time Log</h2>
          {selectedEmployee ? (
            <EmployeeTimeLog employee={selectedEmployee} />
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Select an employee to view their time log.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamPage;
