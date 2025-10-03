
import React, { useState } from 'react';
import { Employee } from './types.ts';

interface EmployeesProps {
    employees: Employee[];
    onAddEmployee: (employee: Omit<Employee, 'id'>) => Promise<Employee>;
    onSelectEmployee: (employee: Employee) => void;
    selectedEmployeeId?: number;
}

const EMPTY_EMPLOYEE: Omit<Employee, 'id'> = { name: '', role: 'Installer', pin: '' };

const Employees: React.FC<EmployeesProps> = ({ employees, onAddEmployee, onSelectEmployee, selectedEmployeeId }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState(EMPTY_EMPLOYEE);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewEmployee(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newEmployee.name && newEmployee.pin.length === 4) {
            await onAddEmployee(newEmployee);
            setNewEmployee(EMPTY_EMPLOYEE);
            setIsModalOpen(false);
        } else {
            alert('Please provide a name and a 4-digit PIN.');
        }
    };

    const input = "mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-4 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white";
    const label = "text-sm font-medium text-slate-600 dark:text-slate-300";

    return (
        <>
            <div className="mt-4 space-y-2">
                {employees.map(e => (
                    <button
                        key={e.id}
                        onClick={() => onSelectEmployee(e)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedEmployeeId === e.id ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600' : 'bg-slate-50 dark:bg-slate-600/50 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                    >
                        <p className="font-semibold">{e.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{e.role}</p>
                    </button>
                ))}
            </div>
            <button onClick={() => setIsModalOpen(true)} className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-semibold shadow hover:bg-blue-700">
                + Add Employee
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400">&times;</button>
                        <form onSubmit={handleSubmit}>
                            <h2 className="text-xl font-bold">Add New Employee</h2>
                            <div className="mt-4 space-y-3">
                                <label className="block"><span className={label}>Full Name</span><input type="text" name="name" value={newEmployee.name} onChange={handleInputChange} className={input} required /></label>
                                <label className="block"><span className={label}>Role</span><input type="text" name="role" value={newEmployee.role} onChange={handleInputChange} className={input} required /></label>
                                <label className="block"><span className={label}>4-Digit PIN</span><input type="password" name="pin" value={newEmployee.pin} onChange={handleInputChange} className={input} required maxLength={4} /></label>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Employees;
