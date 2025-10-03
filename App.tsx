
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SprayFoamCalculator, { CalculationResults, CalculatorInputs, InventoryLineItem } from './components/SprayFoamCalculator.tsx';
import JobCosting from './components/JobCosting.tsx';
import Settings from './components/Settings.tsx';
import Customers from './components/Customers.tsx';
import CustomerDetail from './components/CustomerDetail.tsx';
import Dashboard from './components/Dashboard.tsx';
import JobsList from './components/JobsList.tsx';
import JobDetail from './components/JobDetail.tsx';
import MaterialOrder, { OnHandInventory } from './components/MaterialOrder.tsx';
import Invoicing from './components/Invoicing.tsx';
import JobCalendar from './components/JobCalendar.tsx';
import MapView from './components/MapView.tsx';
import GeminiAgent from './components/GeminiAgent.tsx';
import GanttPage from './components/GanttPage.tsx';
import TeamPage from './components/TeamPage.tsx';
import MorePage from './components/MorePage.tsx';
import TimeClockPage from './components/TimeClockPage.tsx';
import InventoryPage from './components/InventoryPage.tsx';
import EmployeeDashboard from './components/EmployeeDashboard.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import { CompanyInfo, CustomerInfo } from './components/EstimatePDF.tsx';
import { EstimateRecord, JobStatus, InventoryItem } from './lib/db.ts';
import { CostSettings, DEFAULT_COST_SETTINGS } from './lib/processing.ts';
import { Job, Employee, Task, Automation } from './components/types.ts';
import Logo from './components/Logo.tsx';
import CloudSync from './components/CloudSync.tsx';
import AutomationPage from './components/AutomationPage.tsx';
import { processAutomations } from './lib/automations.ts';
import * as api from './lib/api.ts'; // Import the new API service layer
import { getMcpClient } from './lib/mcp.ts';

export type Page = 'dashboard' | 'calculator' | 'costing' | 'customers' | 'customerDetail' | 'jobsList' | 'jobDetail' | 'materialOrder' | 'invoicing' | 'schedule' | 'gantt' | 'map' | 'settings' | 'team' | 'more' | 'timeclock' | 'inventory' | 'employeeDashboard' | 'automations';

export type Theme = 'light' | 'dark' | 'system';

export type CurrentUser = { role: 'admin' } | { role: 'employee'; data: Employee } | null;

export interface AppSettings {
  theme: Theme;
  defaultYields: {
    openCellYield: number;
    closedCellYield: number;
  };
  defaultCosts: CostSettings;
}

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'Spray Foam Pro',
  address: '123 Insulation Way, Buildtown, USA 54321',
  phone: '(555) 867-5309',
  email: 'quotes@sprayfoampro.io',
};

const DEFAULT_APP_SETTINGS: AppSettings = {
    theme: 'system',
    defaultYields: { openCellYield: 16000, closedCellYield: 4000 },
    defaultCosts: DEFAULT_COST_SETTINGS,
};

const DEFAULT_CALCULATOR_INPUTS: CalculatorInputs = {
  calculatorType: 'building',
  length: 100, width: 50, wallHeight: 16, pitchInput: "6/12", includeGableTriangles: true,
  totalWallLength: 0,
  wallFoamType: 'open-cell', wallThicknessIn: 5.5, wallWastePct: 10,
  roofFoamType: 'open-cell', roofThicknessIn: 7.5, roofWastePct: 15,
  openCellYield: 16000, closedCellYield: 4000,
  additionalSections: [],
  inventoryLineItems: [],
};

const EMPTY_CUSTOMER_FORM: Omit<CustomerInfo, 'id'> = { name: '', address: '', email: '', phone: '', notes: '' };

const CALENDAR_STORAGE_KEY = 'jobCalendarJobs';

// Type guard for validating data from localStorage
function isJobArray(obj: any): obj is Job[] {
  return (
    Array.isArray(obj) &&
    obj.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.start === 'string' &&
        typeof item.end === 'string' &&
        typeof item.color === 'string'
    )
  );
}


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ role: 'admin' });
  const [page, setPage] = useState<Page>('dashboard');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [jobs, setJobs] = useState<EstimateRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [calculatorInputs, setCalculatorInputs] = useState<CalculatorInputs>(DEFAULT_CALCULATOR_INPUTS);
  const [calculationResults, setCalculationResults] = useState<CalculationResults | null>(null);
  const [currentJob, setCurrentJob] = useState<EstimateRecord | null>(null);
  const [jobToSchedule, setJobToSchedule] = useState<EstimateRecord | null>(null);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState(EMPTY_CUSTOMER_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  // Material Order State
  const [soldJobData, setSoldJobData] = useState<EstimateRecord | null>(null);
  const [onHandInventory, setOnHandInventory] = useState<OnHandInventory>({ ocSets: 0, ccSets: 0 });

  // Calendar State - Centralized Source of Truth
  const [calendarJobs, setCalendarJobs] = useState<Job[]>([]);

  // Load calendar jobs from localStorage on initial mount
  useEffect(() => {
    try {
      const savedJobs = localStorage.getItem(CALENDAR_STORAGE_KEY);
      if (savedJobs) {
        const parsedJobs = JSON.parse(savedJobs);
        if (isJobArray(parsedJobs)) {
          setCalendarJobs(parsedJobs);
        }
      }
    } catch (error) {
      console.error('Failed to load jobs from localStorage', error);
    }
  }, []);

  // Save calendar jobs to localStorage whenever they change
  useEffect(() => {
    try {
        localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(calendarJobs));
    } catch (error) {
      console.error('Failed to save jobs to localStorage', error);
    }
  }, [calendarJobs]);

  const addCalendarJob = (job: Omit<Job, 'id'>): Job => {
    const newJob: Job = { ...job, id: Date.now().toString() };
    setCalendarJobs(prev => [...prev, newJob]);
    return newJob;
  };

  const handleAddTask = async (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => {
      const addedTask = await api.addTask(task);
      setTasks(prev => [addedTask, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      return addedTask;
  };
  
  const handleAddInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const newItem = await api.addInventoryItem(item);
    setInventoryItems(prev => [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name)));
  };

  const handleUpdateInventoryItem = async (item: InventoryItem) => {
    await api.updateInventoryItem(item);
    setInventoryItems(prev => prev.map(i => i.id === item.id ? item : i));
  };

  const handleDeleteInventoryItem = async (itemId: number) => {
    await api.deleteInventoryItem(itemId);
    setInventoryItems(prev => prev.filter(i => i.id !== itemId));
  };
    
  // --- Automation Action Handlers ---
  const handleSendEmail = async (to: string, subject: string, body: string) => {
    // This now uses the real MCP client to send an email via Zapier.
    console.log(`Attempting to send email to ${to} via MCP automation...`);
    try {
        const client = await getMcpClient();
        await client.callTool({
            name: "gmail_send_email",
            arguments: {
                instructions: `Send an email to the customer with the subject "${subject}" and the provided body content.`,
                to: to,
                subject: subject,
                body: body,
            },
        });
        console.log("MCP email tool called successfully for automation.");
    } catch (error) {
        console.error("Failed to send email via MCP automation:", error);
    }
  };

  const handleDeductInventoryForJob = async (job: EstimateRecord) => {
      const { ocSets, ccSets } = job.calcData;
      if (ocSets > 0) {
          const ocItem = inventoryItems.find(i => i.name.toLowerCase().includes('open-cell set'));
          if (ocItem) {
              const newQuantity = Math.max(0, ocItem.quantity - ocSets);
              await handleUpdateInventoryItem({ ...ocItem, quantity: newQuantity });
              console.log(`Automation: Deducted ${ocSets.toFixed(2)} OC sets. New quantity: ${newQuantity}`);
          } else {
              console.warn("Automation: Could not find 'Open-Cell Set' in inventory to deduct quantity.");
          }
      }
      if (ccSets > 0) {
          const ccItem = inventoryItems.find(i => i.name.toLowerCase().includes('closed-cell set'));
          if (ccItem) {
              const newQuantity = Math.max(0, ccItem.quantity - ccSets);
              await handleUpdateInventoryItem({ ...ccItem, quantity: newQuantity });
              console.log(`Automation: Deducted ${ccSets.toFixed(2)} CC sets. New quantity: ${newQuantity}`);
          } else {
              console.warn("Automation: Could not find 'Closed-Cell Set' in inventory to deduct quantity.");
          }
      }
  };

  const automationActionHandlers = {
      createTask: handleAddTask,
      addToSchedule: addCalendarJob,
      sendEmail: handleSendEmail,
      deductInventoryForJob: handleDeductInventoryForJob,
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const savedInfo = localStorage.getItem('companyInfo');
        const savedSettings = localStorage.getItem('appSettings');

        if (savedInfo && savedSettings) {
            const parsedInfo = JSON.parse(savedInfo);
            const parsedSettings = JSON.parse(savedSettings);
            setCompanyInfo(parsedInfo);
            setAppSettings(parsedSettings);
            setCalculatorInputs(prev => ({
                ...prev,
                openCellYield: parsedSettings.defaultYields.openCellYield,
                closedCellYield: parsedSettings.defaultYields.closedCellYield,
            }));
        } else {
            setCompanyInfo(DEFAULT_COMPANY_INFO);
            setAppSettings(DEFAULT_APP_SETTINGS);
            localStorage.setItem('companyInfo', JSON.stringify(DEFAULT_COMPANY_INFO));
            localStorage.setItem('appSettings', JSON.stringify(DEFAULT_APP_SETTINGS));
        }
        
        // Fetch all data in parallel using the new API service
        const [
            allCustomers,
            allJobs,
            allEmployees,
            allItems,
            allTasks,
            allAutomations,
        ] = await Promise.all([
            api.getCustomers(),
            api.getJobs(),
            api.getEmployees(),
            api.getInventoryItems(),
            api.getTasks(),
            api.getAutomations(),
        ]);
        
        setCustomers(allCustomers);
        setJobs(allJobs);
        setEmployees(allEmployees);
        setInventoryItems(allItems);
        setTasks(allTasks);
        setAutomations(allAutomations);

    } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load application data. Please try again later.");
    } finally {
        setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    loadData();
  }, [loadData]);
  
  useEffect(() => {
    mainContentRef.current?.scrollTo(0, 0);
  }, [page]);

  useEffect(() => {
    if (appSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (appSettings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [appSettings.theme]);
  
  const handleSaveSettings = (info: CompanyInfo, settings: AppSettings) => {
    localStorage.setItem('companyInfo', JSON.stringify(info));
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setCompanyInfo(info);
    setAppSettings(settings);
  };

  const handleAddCustomer = async (customer: Omit<CustomerInfo, 'id'>) => {
    const newCustomerWithId = await api.addCustomer(customer);
    setCustomers(prev => [...prev, newCustomerWithId]);
    processAutomations('new_customer', newCustomerWithId, automations, automationActionHandlers);
    return newCustomerWithId;
  };

  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustomer.name && newCustomer.address) {
      const addedCustomer = await handleAddCustomer(newCustomer);
      setIsAddCustomerModalOpen(false);
      setNewCustomer(EMPTY_CUSTOMER_FORM);
      setSelectedCustomerId(addedCustomer.id);
      setPage('calculator');
    }
  };

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddEmployee = async (employee: Omit<Employee, 'id'>) => {
    const newEmployee = await api.addEmployee(employee);
    setEmployees(prev => [...prev, newEmployee]);
    return newEmployee;
  };

  const handleUpdateCustomer = async (customer: CustomerInfo) => {
      await api.updateCustomer(customer);
      setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
  }

  const handleProceedToCosting = (results: CalculationResults) => {
    setCalculationResults(results);
    setCurrentJob(null);
    setPage('costing');
  };

  const handleEstimateCreated = async (newJobData: Omit<EstimateRecord, 'id' | 'createdAt'>) => {
      const newJob = await api.addJob(newJobData);
      setJobs(prev => [newJob, ...prev]);
      setCurrentJob(newJob);
      setPage('dashboard');
  }

  const handleViewJob = (job: EstimateRecord) => {
      setCurrentJob(job);
      setPage('jobDetail');
  }
  
  const handleViewCustomer = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setPage('customerDetail');
  };
  
  const handleDeleteJob = async (jobId: number) => {
      if (window.confirm("Are you sure you want to permanently delete this job record?")) {
        await api.deleteJob(jobId);
        setJobs(prev => prev.filter(j => j.id !== jobId));
      }
  }

  const handleUpdateJob = async (jobId: number, updates: Partial<Omit<EstimateRecord, 'id'>>) => {
      const originalJob = jobs.find(j => j.id === jobId);
      if (!originalJob) return;

      const updatedJob = await api.updateJob(jobId, updates);
      
      setJobs(prev => prev.map(j => j.id === jobId ? updatedJob : j));

      if (currentJob?.id === jobId) {
          setCurrentJob(updatedJob);
      }

      if (updates.status && updates.status !== originalJob.status) {
          const jobWithCustomer = {
              ...updatedJob,
              calcData: {
                  ...updatedJob.calcData,
                  customer: customers.find(c => c.id === updatedJob.customerId)
              }
          };
          processAutomations('job_status_updated', jobWithCustomer, automations, automationActionHandlers);
      }
  };

  const handleJobSold = (estimate: EstimateRecord) => {
      setSoldJobData(estimate);
      setPage('materialOrder');
  }
  
  const handleFinalizeInvoice = async (finalJobData: EstimateRecord, invoicePdfBlob: Blob) => {
      await handleUpdateJob(finalJobData.id!, { 
        status: 'invoiced', 
        costsData: finalJobData.costsData,
        invoicePdf: invoicePdfBlob 
      });
      setPage('dashboard');
  };

  const handleScheduleJob = (job: EstimateRecord) => {
      setJobToSchedule(job);
      setPage('schedule');
  }

  const resetCurrentJob = () => {
    setCurrentJob(null);
    setCalculationResults(null);
  };
  
  const updateCalendarJob = (job: Job) => {
    setCalendarJobs(prev => prev.map(j => j.id === job.id ? job : j));
  };

  const deleteCalendarJob = (jobId: string) => {
    setCalendarJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const handleFabNewEstimate = () => {
    setSelectedCustomerId('');
    resetCurrentJob();
    setPage('calculator');
  };
  
  const handleFabNewCustomer = () => {
    setNewCustomer(EMPTY_CUSTOMER_FORM);
    setIsAddCustomerModalOpen(true);
  };

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    if (user?.role === 'employee') {
      setPage('employeeDashboard');
    } else {
      setPage('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPage('dashboard');
  };

  const handleAddAutomation = async (automation: Omit<Automation, 'id'>) => {
      const newAutomation = await api.addAutomation(automation);
      setAutomations(prev => [...prev, newAutomation]);
  };

  const handleUpdateAutomation = async (automation: Automation) => {
      await api.updateAutomation(automation);
      setAutomations(prev => prev.map(a => a.id === automation.id ? automation : a));
  };

  const handleDeleteAutomation = async (automationId: number) => {
      await api.deleteAutomation(automationId);
      setAutomations(prev => prev.filter(a => a.id !== automationId));
  };

    const handleUpdateTask = async (task: Task) => {
        await api.updateTask(task);
        setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    };

    const handleDeleteTask = async (taskId: number) => {
        await api.deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const handleToggleTaskCompletion = async (taskId: number) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const updatedTaskData = {
                ...task,
                completed: !task.completed,
                completedAt: !task.completed ? new Date().toISOString() : undefined
            };
            await handleUpdateTask(updatedTaskData);
        }
    };

  const getActiveTab = (currentPage: Page): Page => {
    if (currentUser?.role === 'employee') {
      if (['employeeDashboard'].includes(currentPage)) return 'employeeDashboard';
      if (['schedule'].includes(currentPage)) return 'schedule';
      if (['timeclock'].includes(currentPage)) return 'timeclock';
      return 'employeeDashboard';
    }
    if (['dashboard'].includes(currentPage)) return 'dashboard';
    if (['customers', 'customerDetail'].includes(currentPage)) return 'customers';
    if (['calculator', 'costing', 'jobDetail', 'invoicing'].includes(currentPage)) return 'calculator';
    if (['schedule', 'gantt'].includes(currentPage)) return 'schedule';
    if (['more', 'jobsList', 'team', 'settings', 'materialOrder', 'inventory', 'timeclock', 'map', 'automations'].includes(currentPage)) return 'more';
    return 'dashboard';
  }
  const activeTab = getActiveTab(page);
  
  const MobileNavButton: React.FC<{ target: Page; label: string; icon: React.ReactElement; }> = ({ target, label, icon }) => (
    <button onClick={() => setPage(target)} className={`w-full flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-xs font-semibold ${ activeTab === target ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600' }`} >
      {icon}
      <span>{label}</span>
    </button>
  );

  const SidebarNavButton: React.FC<{ target: Page; label: string; icon: React.ReactElement; active: boolean; }> = ({ target, label, icon, active }) => (
    <button onClick={() => setPage(target)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-semibold ${ active ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' }`} >
      {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5 flex-shrink-0"})}
      <span>{label}</span>
    </button>
  );
  
  const LoadingScreen: React.FC = () => (
      <div className="flex items-center justify-center h-full">
          <div className="text-center">
              <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Loading Application Data...</p>
          </div>
      </div>
  );

  const ErrorScreen: React.FC<{ message: string }> = ({ message }) => (
      <div className="flex items-center justify-center h-full p-4">
          <div className="text-center p-6 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
              <h2 className="text-lg font-bold text-red-700 dark:text-red-300">An Error Occurred</h2>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{message}</p>
              <button onClick={loadData} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">
                  Try Again
              </button>
          </div>
      </div>
  );

  const renderPage = () => {
    if (isLoading) return <LoadingScreen />;
    if (error) return <ErrorScreen message={error} />;

    if (currentUser?.role === 'employee') {
      switch (page) {
        case 'employeeDashboard': return <EmployeeDashboard user={currentUser.data} jobs={calendarJobs} employees={employees} onNavigate={setPage} tasks={tasks} onToggleTaskCompletion={handleToggleTaskCompletion} />;
        case 'schedule': return <JobCalendar jobToSchedule={jobToSchedule} onJobScheduled={() => setJobToSchedule(null)} jobs={calendarJobs} setJobs={setCalendarJobs} employees={employees} currentUser={currentUser} onNavigate={setPage} />;
        case 'timeclock': return <TimeClockPage employees={employees} jobs={jobs} currentUser={currentUser.data} />;
        default: return <EmployeeDashboard user={currentUser.data} jobs={calendarJobs} employees={employees} onNavigate={setPage} tasks={tasks} onToggleTaskCompletion={handleToggleTaskCompletion} />;
      }
    }

    if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} />;
    }

    switch (page) {
      case 'dashboard': return <Dashboard jobs={jobs} onViewJob={handleViewJob} onNavigateToFilteredJobs={(status) => { setFilter(status); setPage('jobsList'); }} onNavigate={setPage} tasks={tasks} employees={employees} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onToggleTaskCompletion={handleToggleTaskCompletion} />;
      case 'calculator': return <SprayFoamCalculator onProceedToCosting={handleProceedToCosting} customers={customers} setIsAddCustomerModalOpen={setIsAddCustomerModalOpen} selectedCustomerId={selectedCustomerId} setSelectedCustomerId={setSelectedCustomerId} calculatorInputs={calculatorInputs} setCalculatorInputs={setCalculatorInputs} defaultYields={appSettings.defaultYields} inventoryItems={inventoryItems} defaultCalculatorInputs={DEFAULT_CALCULATOR_INPUTS} />;
      case 'costing': return calculationResults ? <JobCosting calculationResults={calculationResults} onBack={() => setPage('calculator')} companyInfo={companyInfo!} onEstimateCreated={handleEstimateCreated} defaultCosts={appSettings.defaultCosts} inventoryItems={inventoryItems} /> : <div className="p-4">Please calculate a job first.</div>;
      case 'customers': return <Customers customers={customers} onAddCustomer={handleAddCustomer} onViewCustomer={handleViewCustomer} onUpdateCustomer={handleUpdateCustomer} />;
      case 'customerDetail': return <CustomerDetail customerId={selectedCustomerId as number} onBack={() => setPage('customers')} onViewJob={handleViewJob} onUpdateCustomer={handleUpdateCustomer} />;
      case 'jobsList': return <JobsList jobs={jobs} customers={customers} onViewJob={handleViewJob} onDeleteJob={handleDeleteJob} filter={filter} setFilter={setFilter} />;
      case 'jobDetail': return currentJob ? <JobDetail job={currentJob} customers={customers} employees={employees} onBack={() => setPage('jobsList')} onUpdateJob={handleUpdateJob} onPrepareInvoice={(job) => { setCurrentJob(job); setPage('invoicing')}} onScheduleJob={handleScheduleJob} onViewCustomer={handleViewCustomer} /> : <div className="p-4">No job selected.</div>;
      case 'materialOrder': return <MaterialOrder soldJobData={soldJobData} onHandInventory={onHandInventory} setOnHandInventory={setOnHandInventory} />;
      case 'invoicing': return currentJob ? <JobCosting calculationResults={currentJob.calcData} onBack={() => setPage('jobDetail')} companyInfo={companyInfo!} isInvoiceMode initialJobData={currentJob} onFinalizeInvoice={handleFinalizeInvoice} defaultCosts={appSettings.defaultCosts} inventoryItems={inventoryItems} /> : <Invoicing soldJobs={jobs.filter(j => j.status === 'sold' || j.status === 'invoiced')} customers={customers} companyInfo={companyInfo!} onPrepareInvoice={(job) => { setCurrentJob(job); setPage('invoicing'); }} />;
      case 'schedule': return <JobCalendar jobToSchedule={jobToSchedule} onJobScheduled={() => setJobToSchedule(null)} jobs={calendarJobs} setJobs={setCalendarJobs} employees={employees} currentUser={currentUser} onNavigate={setPage} />;
      case 'gantt': return <GanttPage jobs={calendarJobs} setJobs={setCalendarJobs} employees={employees} onNavigate={setPage} />;
      case 'map': return <MapView customers={customers} onUpdateCustomer={handleUpdateCustomer} />;
      case 'settings': return <Settings onSave={handleSaveSettings} currentInfo={companyInfo} appSettings={appSettings} />;
      case 'team': return <TeamPage employees={employees} onAddEmployee={handleAddEmployee} jobs={jobs} />;
      case 'more': return <MorePage onNavigate={setPage} onLogout={handleLogout} />;
      case 'timeclock': return <TimeClockPage employees={employees} jobs={jobs} />;
      case 'inventory': return <InventoryPage items={inventoryItems} onAddItem={handleAddInventoryItem} onUpdateItem={handleUpdateInventoryItem} onDeleteItem={handleDeleteInventoryItem} />;
      case 'automations': return <AutomationPage automations={automations} onAddAutomation={handleAddAutomation} onUpdateAutomation={handleUpdateAutomation} onDeleteAutomation={handleDeleteAutomation} />;
      default: return <Dashboard jobs={jobs} onViewJob={handleViewJob} onNavigateToFilteredJobs={(status) => { setFilter(status); setPage('jobsList'); }} onNavigate={setPage} tasks={tasks} employees={employees} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onToggleTaskCompletion={handleToggleTaskCompletion} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-sans">
        
        {currentUser && (
            <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-center h-24 items-center">
                    <Logo />
                </div>
                
                <div className="flex-grow p-4 space-y-1">
                    {currentUser.role === 'admin' ? (
                        <>
                            <div className="space-y-3 mb-4">
                                <button onClick={handleFabNewEstimate} className="w-full text-center rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-semibold shadow hover:bg-blue-700 transition-colors">
                                    + New Job / Estimate
                                </button>
                                <button onClick={handleFabNewCustomer} className="w-full text-center rounded-lg bg-slate-200 dark:bg-slate-700 px-4 py-2 text-sm text-slate-800 dark:text-slate-100 font-semibold shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                    + New Customer
                                </button>
                            </div>
                            <SidebarNavButton target="dashboard" label="Dashboard" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} active={activeTab === 'dashboard'} />
                            <SidebarNavButton target="customers" label="Clients" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} active={activeTab === 'customers'} />
                            <SidebarNavButton target="schedule" label="Schedule" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} active={activeTab === 'schedule'} />
                            <SidebarNavButton target="more" label="More..." icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>} active={activeTab === 'more'} />
                        </>
                    ) : (
                        <>
                            <SidebarNavButton target="employeeDashboard" label="Home" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} active={activeTab === 'employeeDashboard'} />
                            <SidebarNavButton target="schedule" label="Schedule" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} active={activeTab === 'schedule'} />
                            <SidebarNavButton target="timeclock" label="Time Clock" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} active={activeTab === 'timeclock'} />
                        </>
                    )}
                </div>

                 <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold truncate">{currentUser.role === 'admin' ? 'Admin' : currentUser.data.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser.role === 'admin' ? 'Administrator' : currentUser.data.role}</p>
                    <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:underline mt-2">Logout</button>
                </div>
            </aside>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
            <main ref={mainContentRef} className={`flex-grow overflow-y-auto ${currentUser ? 'pb-24 md:pb-0' : ''}`}>
                {renderPage()}
            </main>
        </div>

        {currentUser && (
            <>
                {currentUser.role === 'admin' && companyInfo && (
                    <CloudSync customers={customers} jobs={jobs} companyInfo={companyInfo} getMcpClient={getMcpClient} />
                )}
                <GeminiAgent 
                    setMainPage={setPage}
                    customers={customers}
                    handleAddCustomer={handleAddCustomer}
                    handleUpdateCustomer={handleUpdateCustomer}
                    setSelectedCustomerId={setSelectedCustomerId}
                    calculatorInputs={calculatorInputs}
                    setCalculatorInputs={setCalculatorInputs}
                    onHandInventory={onHandInventory}
                    setOnHandInventory={setOnHandInventory}
                    handleJobSold={handleJobSold}
                    companyInfo={companyInfo!}
                    calendarJobs={calendarJobs}
                    onAddCalendarJob={addCalendarJob}
                    onUpdateCalendarJob={updateCalendarJob}
                    onDeleteCalendarJob={deleteCalendarJob}
                    appSettings={appSettings}
                    jobs={jobs}
                    handleUpdateJob={handleUpdateJob}
                />
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 p-2 shadow-t-lg">
                    <div className="mx-auto max-w-md grid grid-cols-5 gap-2">
                        {currentUser.role === 'admin' ? (
                            <>
                                <MobileNavButton target="dashboard" label="Home" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} />
                                <MobileNavButton target="customers" label="Clients" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                                <MobileNavButton target="calculator" label="New Job" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>} />
                                <MobileNavButton target="schedule" label="Schedule" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                                <MobileNavButton target="more" label="More" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>} />
                            </>
                        ) : (
                             <>
                                <MobileNavButton target="employeeDashboard" label="Home" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} />
                                <MobileNavButton target="schedule" label="Schedule" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                                <div className="w-full"></div>
                                <MobileNavButton target="timeclock" label="Time Clock" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                                <div className="w-full"></div>
                             </>
                        )}
                    </div>
                </nav>
            </>
        )}

        {isAddCustomerModalOpen && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
                 <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl">
                    <button onClick={() => setIsAddCustomerModalOpen(false)} className="absolute top-4 right-4 text-slate-400">&times;</button>
                    <form onSubmit={handleSaveNewCustomer}>
                        <h2 className="text-xl font-bold">Add New Customer</h2>
                        <div className="mt-4 space-y-3">
                            <label className="block"><span className="text-sm font-medium">Full Name</span><input type="text" name="name" value={newCustomer.name} onChange={handleNewCustomerChange} className="mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-3 py-2" required /></label>
                            <label className="block"><span className="text-sm font-medium">Address</span><input type="text" name="address" value={newCustomer.address} onChange={handleNewCustomerChange} className="mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-3 py-2" required /></label>
                             <label className="block"><span className="text-sm font-medium">Email</span><input type="email" name="email" value={newCustomer.email} onChange={handleNewCustomerChange} className="mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-3 py-2" /></label>
                              <label className="block"><span className="text-sm font-medium">Phone</span><input type="tel" name="phone" value={newCustomer.phone} onChange={handleNewCustomerChange} className="mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-3 py-2" /></label>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsAddCustomerModalOpen(false)}>Cancel</button>
                            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700">Save & Start Estimate</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
export default App;