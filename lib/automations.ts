

import { Automation, Task, Job } from '../components/types.ts';
import { EstimateRecord } from './db.ts';
import { CustomerInfo } from '../components/EstimatePDF.tsx';
import { fmtInput } from '../components/utils.ts';

// Type for the action handler functions passed from App.tsx
interface ActionHandlers {
    createTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => Promise<Task>;
    addToSchedule: (job: Omit<Job, 'id'>) => Job;
    sendEmail: (to: string, subject: string, body: string) => Promise<void>;
    deductInventoryForJob: (job: EstimateRecord) => Promise<void>;
}

// Function to replace placeholders like [customer_name] in strings
const replacePlaceholders = (text: string, data: any): string => {
    if (!text) return '';
    let result = text;
    result = result.replace(/\[customer_name\]/g, data.calcData?.customer?.name || data.name || '');
    result = result.replace(/\[customer_address\]/g, data.calcData?.customer?.address || data.address || '');
    result = result.replace(/\[job_number\]/g, data.estimateNumber || '');
    result = result.replace(/\[job_value\]/g, data.costsData?.finalQuote?.toFixed(2) || '');
    return result;
};


export const processAutomations = (
    triggerType: 'new_customer' | 'job_status_updated',
    data: CustomerInfo | EstimateRecord,
    allAutomations: Automation[],
    handlers: ActionHandlers
) => {
    const automationsToRun = allAutomations.filter(a => a.is_enabled && a.trigger_type === triggerType);

    for (const automation of automationsToRun) {
        let shouldRun = false;

        // Check conditions
        if (triggerType === 'new_customer') {
            shouldRun = true;
        } else if (triggerType === 'job_status_updated') {
            const job = data as EstimateRecord;
            if (job.status === automation.trigger_config.to_status) {
                shouldRun = true;
            }
        }

        if (shouldRun) {
            console.log(`Running automation: ${automation.name}`);
            executeAction(automation, data, handlers);
        }
    }
};

const executeAction = async (automation: Automation, data: CustomerInfo | EstimateRecord, handlers: ActionHandlers) => {
    switch (automation.action_type) {
        case 'webhook':
            if (automation.action_config.url) {
                try {
                    await fetch(automation.action_config.url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                } catch (error) {
                    console.error(`Webhook for automation "${automation.name}" failed:`, error);
                }
            }
            break;

        case 'create_task':
            if (automation.action_config.task_title) {
                const title = replacePlaceholders(automation.action_config.task_title, data);
                const description = replacePlaceholders(automation.action_config.task_description || '', data);
                await handlers.createTask({
                    title,
                    description,
                    assignedTo: [], // Default to admin/unassigned
                });
            }
            break;
        
        case 'add_to_schedule':
            const jobData = data as EstimateRecord;
            if (jobData && jobData.calcData?.customer) {
                const jobName = replacePlaceholders("[customer_name] ([job_number])", jobData);
                handlers.addToSchedule({
                    name: jobName,
                    start: fmtInput(new Date()),
                    end: fmtInput(new Date()),
                    color: '#3498DB',
                    links: [],
                });
            }
            break;
        
        case 'send_email':
            const customerEmail = (data as any).calcData?.customer?.email || (data as CustomerInfo).email;
            if (customerEmail && automation.action_config.email_subject) {
                const subject = replacePlaceholders(automation.action_config.email_subject, data);
                const body = replacePlaceholders(automation.action_config.email_body || '', data);
                await handlers.sendEmail(customerEmail, subject, body);
            } else {
                console.warn(`Automation "${automation.name}" skipped: No customer email found.`);
            }
            break;

        case 'update_inventory':
            if ('estimateNumber' in data) { // Check if data is an EstimateRecord
                await handlers.deductInventoryForJob(data as EstimateRecord);
            } else {
                console.warn(`Automation "${automation.name}" skipped: 'update_inventory' action can only be triggered by job-related events.`);
            }
            break;
    }
};