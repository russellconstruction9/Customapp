
import { db, EstimateRecord, InventoryItem } from './db';
import { CustomerInfo } from '../components/EstimatePDF';
import { Employee, Task, Automation } from '../components/types';

// This file acts as a service layer for all data operations.
// Currently, it uses Dexie.js for local storage.
// To switch to a backend, you only need to replace the logic inside these functions
// with HTTP requests (e.g., using fetch or axios) to your API endpoints.

// --- Customer Operations ---
export const getCustomers = async (): Promise<CustomerInfo[]> => {
    // TODO: Replace with: return await fetch('/api/customers').then(res => res.json());
    return await db.customers.toArray();
};

export const addCustomer = async (customer: Omit<CustomerInfo, 'id'>): Promise<CustomerInfo> => {
    const newId = await db.customers.add(customer as CustomerInfo);
    return { ...customer, id: newId };
};

export const updateCustomer = async (customer: CustomerInfo): Promise<void> => {
    await db.customers.put(customer);
};

// --- Job/Estimate Operations ---
export const getJobs = async (): Promise<EstimateRecord[]> => {
    return await db.estimates.orderBy('createdAt').reverse().toArray();
};

export const addJob = async (jobData: Omit<EstimateRecord, 'id' | 'createdAt'>): Promise<EstimateRecord> => {
    const recordToSave: Omit<EstimateRecord, 'id'> = {
        ...jobData,
        createdAt: new Date().toISOString()
    };
    const id = await db.estimates.add(recordToSave as EstimateRecord);
    return { ...recordToSave, id };
};

export const updateJob = async (jobId: number, updates: Partial<Omit<EstimateRecord, 'id'>>): Promise<EstimateRecord> => {
    await db.estimates.update(jobId, updates);
    const updatedJob = await db.estimates.get(jobId);
    if (!updatedJob) throw new Error("Failed to find job after update.");
    return updatedJob;
};

export const deleteJob = async (jobId: number): Promise<void> => {
    await db.estimates.delete(jobId);
};

// --- Employee Operations ---
export const getEmployees = async (): Promise<Employee[]> => {
    return await db.employees.toArray();
};

export const addEmployee = async (employee: Omit<Employee, 'id'>): Promise<Employee> => {
    const newId = await db.employees.add(employee as Employee);
    return { ...employee, id: newId };
};

// --- Inventory Operations ---
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
    return await db.inventory.toArray();
};

export const addInventoryItem = async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
    const newId = await db.inventory.add(item as InventoryItem);
    return { ...item, id: newId };
};

export const updateInventoryItem = async (item: InventoryItem): Promise<void> => {
    await db.inventory.put(item);
};

export const deleteInventoryItem = async (itemId: number): Promise<void> => {
    await db.inventory.delete(itemId);
};

// --- Task Operations ---
export const getTasks = async (): Promise<Task[]> => {
    return await db.tasks.orderBy('createdAt').reverse().toArray();
};

export const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>): Promise<Task> => {
    const newTask: Omit<Task, 'id'> = {
        ...task,
        completed: false,
        createdAt: new Date().toISOString(),
    };
    const newId = await db.tasks.add(newTask as Task);
    return { ...newTask, id: newId };
};

export const updateTask = async (task: Task): Promise<void> => {
    await db.tasks.put(task);
};

export const deleteTask = async (taskId: number): Promise<void> => {
    await db.tasks.delete(taskId);
};

// --- Automation Operations ---
export const getAutomations = async (): Promise<Automation[]> => {
    return await db.automations.toArray();
};

export const addAutomation = async (automation: Omit<Automation, 'id'>): Promise<Automation> => {
    const newId = await db.automations.add(automation as Automation);
    return { ...automation, id: newId };
};

export const updateAutomation = async (automation: Automation): Promise<void> => {
    await db.automations.put(automation);
};

export const deleteAutomation = async (automationId: number): Promise<void> => {
    await db.automations.delete(automationId);
};
