import React, { useState, useEffect, useMemo } from 'react';
import { EstimateRecord, JobStatus } from '../lib/db.ts';
import { Task, Employee } from '../components/types.ts';

interface DashboardProps {
    jobs: EstimateRecord[];
    onViewJob: (job: EstimateRecord) => void;
    onNavigateToFilteredJobs: (status: JobStatus) => void;
    onNavigate: (page: 'materialOrder') => void;
    tasks: Task[];
    employees: Employee[];
    // FIX: Changed the return type from Promise<void> to Promise<Task> to align with the handleAddTask function in App.tsx, which is required by the automations feature.
    onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => Promise<Task>;
    onUpdateTask: (task: Task) => Promise<void>;
    onDeleteTask: (taskId: number) => Promise<void>;
    onToggleTaskCompletion: (taskId: number) => Promise<void>;
}

interface OnHandInventory {
    ocSets: number;
    ccSets: number;
}

const ON_HAND_STORAGE_KEY = 'materialInventoryOnHand';
const EMPTY_TASK: Omit<Task, 'id' | 'completed' | 'createdAt' | 'completedAt'> = {
    title: '',
    description: '',
    dueDate: '',
    assignedTo: [],
};

function fmtCurrency(n: number, options: Intl.NumberFormatOptions = {}) {
    if (Number.isNaN(n) || !Number.isFinite(n)) return "$0.00";
    return n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        ...options
    });
}

const getStatusBadge = (status: JobStatus) => {
  switch (status) {
    case 'estimate':
      return <span className="text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">Estimate</span>;
    case 'sold':
      return <span className="text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-0.5 rounded-full">Sold</span>;
    case 'invoiced':
      return <span className="text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200 px-2 py-0.5 rounded-full">Invoiced</span>;
    case 'paid':
      return <span className="text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2 py-0.5 rounded-full">Paid</span>;
    default:
      return null;
  }
};


const Dashboard: React.FC<DashboardProps> = ({
    jobs, onViewJob, onNavigateToFilteredJobs, onNavigate,
    tasks, employees, onAddTask, onUpdateTask, onDeleteTask, onToggleTaskCompletion
}) => {
    const [onHand, setOnHand] = useState<OnHandInventory>({ ocSets: 0, ccSets: 0 });
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Omit<Task, 'id' | 'completed' | 'createdAt' | 'completedAt'> | Task | null>(null);

    useEffect(() => {
        const loadData = () => {
            try {
                const savedOnHand = localStorage.getItem(ON_HAND_STORAGE_KEY);
                if (savedOnHand) {
                    const parsed = JSON.parse(savedOnHand);
                    setOnHand({ ocSets: parsed.ocSets || 0, ccSets: parsed.ccSets || 0 });
                } else {
                    setOnHand({ ocSets: 0, ccSets: 0 });
                }
            } catch (error) {
                console.error("Failed to load dashboard data from localStorage", error);
            }
        };

        loadData();
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, []);

    const {
        paidValue,
        invoicedValue,
        soldValue,
        neededOcSets,
        neededCcSets,
        recentJobs
    } = useMemo(() => {
        const paidValue = jobs
            .filter(j => j.status === 'paid')
            .reduce((sum, j) => sum + (j.costsData?.finalQuote || 0), 0);

        const invoicedValue = jobs
            .filter(j => j.status === 'invoiced')
            .reduce((sum, j) => sum + (j.costsData?.finalQuote || 0), 0);

        const soldValue = jobs
            .filter(j => j.status === 'sold')
            .reduce((sum, j) => sum + (j.costsData?.finalQuote || 0), 0);

        const committedJobs = jobs.filter(j => j.status === 'sold' || j.status === 'invoiced' || j.status === 'paid');
        const totalCommittedOcSets = committedJobs.reduce((sum, j) => sum + (j.calcData?.ocSets || 0), 0);
        const totalCommittedCcSets = committedJobs.reduce((sum, j) => sum + (j.calcData?.ccSets || 0), 0);

        const neededOcSets = Math.max(0, totalCommittedOcSets - onHand.ocSets);
        const neededCcSets = Math.max(0, totalCommittedCcSets - onHand.ccSets);

        const recentJobs = [...jobs].slice(0, 5);

        return { paidValue, invoicedValue, soldValue, neededOcSets, neededCcSets, recentJobs };
    }, [jobs, onHand]);

    const { incompleteTasks, completedTasks } = useMemo(() => {
        const incomplete = tasks.filter(t => !t.completed).sort((a,b) => (a.dueDate || '9999').localeCompare(a.dueDate || '9999'));
        const completed = tasks.filter(t => t.completed).sort((a,b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
        return { incompleteTasks: incomplete, completedTasks: completed.slice(0, 5) };
    }, [tasks]);

    const getAssigneeNames = (assignedTo: number[]): string => {
        if (!assignedTo || assignedTo.length === 0) return 'Admin/Everyone';
        return assignedTo.map(id => employees.find(e => e.id === id)?.name.split(' ')[0] || '')
                         .filter(Boolean)
                         .join(', ');
    }

    const handleOpenTaskModal = (task: Task | null) => {
        setEditingTask(task ? { ...task } : { ...EMPTY_TASK });
        setIsTaskModalOpen(true);
    };

    const handleTaskSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask || !editingTask.title) return;

        if ('id' in editingTask && editingTask.id) {
            await onUpdateTask(editingTask);
        } else {
            await onAddTask(editingTask);
        }
        setIsTaskModalOpen(false);
        setEditingTask(null);
    };

    const handleTaskInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!editingTask) return;
        const { name, value } = e.target;
        setEditingTask(prev => ({ ...prev!, [name]: value }));
    };

    const handleTaskAssigneeChange = (employeeId: number) => {
        if (!editingTask) return;
        setEditingTask(prev => {
            const currentAssigned = prev!.assignedTo || [];
            const isAssigned = currentAssigned.includes(employeeId);
            const newAssigned = isAssigned
                ? currentAssigned.filter(id => id !== employeeId)
                : [...currentAssigned, employeeId];
            return { ...prev!, assignedTo: newAssigned };
        });
    };

    const isTaskOverdue = (task: Task) => {
        return task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
    }

    const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm";
    const h2 = "text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100";
    const metricLabel = "text-sm font-medium text-slate-600 dark:text-slate-300";

    const KpiCard: React.FC<{ label: string, value: string, icon: React.ReactElement, onClick?: () => void }> = ({ label, value, icon, onClick }) => (
        <button onClick={onClick} disabled={!onClick} className={`${card} p-4 w-full transition-all duration-200 text-left ${onClick ? 'hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-600/50' : 'cursor-default'}`}>
            <div className="flex justify-between items-start">
                <h2 className={metricLabel}>{label}</h2>
                {icon}
            </div>
            <p className="text-slate-800 dark:text-slate-50 mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </button>
    );

    const FinancialPipelineChart: React.FC<{ paid: number, invoiced: number, sold: number }> = ({ paid, invoiced, sold }) => {
        const total = paid + invoiced + sold;
        const paidPct = total > 0 ? (paid / total) * 100 : 0;
        const invoicedPct = total > 0 ? (invoiced / total) * 100 : 0;
        const soldPct = total > 0 ? (sold / total) * 100 : 0;

        const LegendItem: React.FC<{ color: string, label: string, value: number }> = ({ color, label, value }) => (
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${color}`}></div>
                <div>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">{fmtCurrency(value)}</span>
                </div>
            </div>
        );

        return (
            <div className={`${card} p-6 h-full flex flex-col`}>
                <div className="flex justify-between items-center">
                    <h2 className={h2}>Financial Pipeline</h2>
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-50">{fmtCurrency(total)}</span>
                </div>
                <div className="mt-4 flex-grow flex flex-col justify-center">
                    <div className="w-full h-8 flex rounded-full overflow-hidden bg-slate-200 dark:bg-slate-600">
                        <div className="bg-green-500 transition-all duration-500" style={{ width: `${paidPct}%` }} title={`Paid: ${fmtCurrency(paid)}`}></div>
                        <div className="bg-amber-500 transition-all duration-500" style={{ width: `${invoicedPct}%` }} title={`Invoiced (A/R): ${fmtCurrency(invoiced)}`}></div>
                        <div className="bg-blue-500 transition-all duration-500" style={{ width: `${soldPct}%` }} title={`Sold (Pipeline): ${fmtCurrency(sold)}`}></div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2">
                        <LegendItem color="bg-green-500" label="Paid" value={paid} />
                        <LegendItem color="bg-amber-500" label="Invoiced" value={invoiced} />
                        <LegendItem color="bg-blue-500" label="Sold" value={sold} />
                    </div>
                </div>
            </div>
        );
    };
    
    const TaskItem: React.FC<{ task: Task }> = ({ task }) => (
        <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600/50">
            <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggleTaskCompletion(task.id!)}
                className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-grow">
                <p className={`font-medium ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>{task.title}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {task.dueDate && <span className={isTaskOverdue(task) ? 'font-bold text-red-500' : ''}>{new Date(task.dueDate.replace(/-/g, '/')).toLocaleDateString()}</span>}
                    {task.dueDate && <span>&bull;</span>}
                    <span>{getAssigneeNames(task.assignedTo)}</span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => handleOpenTaskModal(task)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-500 text-slate-500 dark:text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                {!task.completed && <button onClick={() => onDeleteTask(task.id!)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>}
            </div>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl p-4 md:p-6 font-sans space-y-6">
             <div className="mb-2">
                <h1 className="text-3xl font-bold dark:text-white">Dashboard</h1>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 <KpiCard
                    label="Total Revenue (Paid)"
                    value={fmtCurrency(paidValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    icon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
                    onClick={() => onNavigateToFilteredJobs('paid')}
                />
                <KpiCard
                    label="A/R (Invoiced)"
                    value={fmtCurrency(invoicedValue)}
                    icon={<svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                    onClick={() => onNavigateToFilteredJobs('invoiced')}
                />
                <KpiCard
                    label="Pipeline (Sold)"
                    value={fmtCurrency(soldValue)}
                    icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                    onClick={() => onNavigateToFilteredJobs('sold')}
                />
                <button onClick={() => onNavigate('materialOrder')} className={`${card} p-4 w-full transition-all duration-200 text-left hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-600/50`}>
                     <div className="flex justify-between items-start">
                        <h2 className={metricLabel}>Materials to Order</h2>
                        <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    </div>
                     <div className="mt-2 flex items-baseline gap-4">
                        <div>
                            <span className="text-3xl font-bold tracking-tight">{neededOcSets.toFixed(1)}</span>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">OC</span>
                        </div>
                         <div>
                            <span className="text-3xl font-bold tracking-tight">{neededCcSets.toFixed(1)}</span>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">CC</span>
                        </div>
                    </div>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <FinancialPipelineChart paid={paidValue} invoiced={invoicedValue} sold={soldValue} />
                </div>
                <div className={`${card} p-4 flex flex-col`}>
                    <div className="flex justify-between items-center mb-2">
                        <h2 className={h2}>Tasks</h2>
                        <button onClick={() => handleOpenTaskModal(null)} className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white font-semibold shadow-sm hover:bg-blue-700 transition-colors">
                            + Add Task
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                        {incompleteTasks.length === 0 && completedTasks.length === 0 ? (
                            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">No tasks yet.</p>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-600">
                                {incompleteTasks.map(task => <TaskItem key={task.id} task={task} />)}
                                {completedTasks.length > 0 && (
                                    <details className="p-2 text-sm">
                                        <summary className="cursor-pointer font-medium text-slate-500 dark:text-slate-400">Recently Completed</summary>
                                        <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-600">
                                            {completedTasks.map(task => <TaskItem key={task.id} task={task} />)}
                                        </div>
                                    </details>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className={`${card} p-4`}>
                 <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Recent Jobs</h2>
                 <div className="space-y-2">
                    {recentJobs.length > 0 ? (
                        recentJobs.map(job => (
                            <button key={job.id} onClick={() => onViewJob(job)} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-slate-700 dark:text-slate-200">{job.calcData?.customer?.name || 'Unknown'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{job.estimateNumber}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-50 hidden sm:block">{fmtCurrency(job.costsData?.finalQuote || 0)}</p>
                                    {getStatusBadge(job.status)}
                                </div>
                            </button>
                        ))
                    ) : (
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">No jobs created yet.</p>
                    )}
                 </div>
            </div>

            {isTaskModalOpen && editingTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setIsTaskModalOpen(false)}>
                    <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsTaskModalOpen(false)} className="absolute top-4 right-4 text-slate-400">&times;</button>
                        <form onSubmit={handleTaskSubmit}>
                            <h2 className="text-xl font-bold dark:text-white">{'id' in editingTask ? 'Edit Task' : 'New Task'}</h2>
                            <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                <label className="block">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Title</span>
                                    <input type="text" name="title" value={editingTask.title} onChange={handleTaskInputChange} className="mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-3 py-2" required />
                                </label>
                                <label className="block">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Description (Optional)</span>
                                    <textarea name="description" value={editingTask.description || ''} onChange={handleTaskInputChange} rows={3} className="mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-3 py-2"></textarea>
                                </label>
                                <label className="block">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Due Date (Optional)</span>
                                    <input type="date" name="dueDate" value={editingTask.dueDate || ''} onChange={handleTaskInputChange} className="mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-3 py-2" />
                                </label>
                                <div>
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Assign To (Optional)</span>
                                    <div className="mt-2 grid grid-cols-2 gap-2 p-2 border rounded-lg max-h-32 overflow-y-auto border-slate-300 dark:border-slate-500">
                                        {employees.map(emp => (
                                            <label key={emp.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingTask.assignedTo.includes(emp.id!)}
                                                    onChange={() => handleTaskAssigneeChange(emp.id!)}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm">{emp.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="rounded-lg px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700">Save Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;