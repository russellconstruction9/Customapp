

export interface Job {
    id: string;
    name: string;
    start: string; // "YYYY-MM-DD"
    end: string; // "YYYY-MM-DD"
    color: string;
    links: string[];
    assignedTeam?: number[];
}

export interface EditingJob extends Partial<Job> {
    id: string; // id is not partial
}

export interface Employee {
    id?: number;
    name: string;
    role: string;
    pin: string; // 4-digit PIN for time clock
}

export interface TimeEntry {
    id?: number;
    employeeId: number;
    jobId: number;
    startTime: string; // ISO string
    endTime?: string; // ISO string
    startLat?: number;
    startLng?: number;
    endLat?: number;
    endLng?: number;
    durationHours?: number;
}

export interface Task {
    id?: number;
    title: string;
    description?: string;
    dueDate?: string; // YYYY-MM-DD
    completed: boolean;
    assignedTo: number[]; // empty array means for all admins/unassigned
    createdAt: string; // ISO string
    completedAt?: string; // ISO string
}

export interface DriveFile {
  id?: number;
  customerId: number;
  fileId: string;
  fileName: string;
  webLink: string;
  iconLink: string;
}

// --- Automation Types ---
export type TriggerType = 'new_customer' | 'job_status_updated';
export type ActionType = 'webhook' | 'create_task' | 'add_to_schedule' | 'send_email' | 'update_inventory';

export interface Action {
    id: number; // For React key, e.g. Date.now()
    action_type: ActionType;
    action_config: {
        url?: string; // for webhook
        task_title?: string;
        task_description?: string;
        email_subject?: string; // for send_email
        email_body?: string;    // for send_email
    };
}

export interface Automation {
    id?: number;
    name: string;
    trigger_type: TriggerType;
    trigger_config: {
        to_status?: string; // e.g., 'sold'
    };
    actions: Action[];
    is_enabled: boolean;
}