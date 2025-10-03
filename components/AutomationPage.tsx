
import React, { useState } from 'react';
import { Automation } from './types.ts';
import AutomationEditor from './AutomationEditor.tsx';

interface AutomationPageProps {
  automations: Automation[];
  onAddAutomation: (automation: Omit<Automation, 'id'>) => Promise<void>;
  onUpdateAutomation: (automation: Automation) => Promise<void>;
  onDeleteAutomation: (automationId: number) => Promise<void>;
}

const getTriggerDescription = (automation: Automation): string => {
    switch (automation.trigger_type) {
        case 'new_customer':
            return 'When a new customer is created';
        case 'job_status_updated':
            return `When a job is marked as '${automation.trigger_config.to_status}'`;
        default:
            return 'Unknown Trigger';
    }
};

const getActionDescription = (automation: Automation): string => {
    switch (automation.action_type) {
        case 'webhook':
            return `Trigger a webhook`;
        case 'create_task':
            return `Create a task: "${automation.action_config.task_title}"`;
        case 'add_to_schedule':
            return 'Add job to the schedule';
        case 'send_email':
            return `Send an email with subject: "${automation.action_config.email_subject}"`;
        case 'update_inventory':
            return `Deduct foam sets from inventory`;
        default:
            return 'Unknown Action';
    }
};

const AutomationPage: React.FC<AutomationPageProps> = ({ automations, onAddAutomation, onUpdateAutomation, onDeleteAutomation }) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

    const handleOpenEditor = (automation: Automation | null) => {
        setEditingAutomation(automation);
        setIsEditorOpen(true);
    };

    const handleSave = async (automation: Omit<Automation, 'id'> | Automation) => {
        if ('id' in automation) {
            await onUpdateAutomation(automation);
        } else {
            await onAddAutomation(automation);
        }
        setIsEditorOpen(false);
    };

    const handleToggle = (automation: Automation) => {
        onUpdateAutomation({ ...automation, is_enabled: !automation.is_enabled });
    };
    
    const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm";

    return (
        <>
            <div className="mx-auto max-w-4xl p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white">Automations</h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Create workflows to automate repetitive tasks.
                        </p>
                    </div>
                    <button onClick={() => handleOpenEditor(null)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-semibold shadow hover:bg-blue-700">
                        + Create Automation
                    </button>
                </div>
                
                <div className={`${card} p-4`}>
                    <div className="space-y-3">
                        {automations.length === 0 ? (
                            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
                                No automations created yet. Get started by creating one!
                            </p>
                        ) : (
                            automations.map(auto => (
                                <div key={auto.id} className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 flex items-center justify-between gap-3">
                                    <label className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={auto.is_enabled} onChange={() => handleToggle(auto)} />
                                            <div className={`block w-10 h-6 rounded-full transition ${auto.is_enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-500'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${auto.is_enabled ? 'translate-x-4' : ''}`}></div>
                                        </div>
                                    </label>
                                    <div className="flex-grow mx-4">
                                        <p className={`font-semibold text-slate-800 dark:text-slate-100 ${!auto.is_enabled ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>{auto.name}</p>
                                        <p className={`text-xs text-slate-500 dark:text-slate-400 ${!auto.is_enabled ? 'line-through' : ''}`}>
                                            <span className="font-medium">When:</span> {getTriggerDescription(auto)}
                                        </p>
                                        <p className={`text-xs text-slate-500 dark:text-slate-400 ${!auto.is_enabled ? 'line-through' : ''}`}>
                                            <span className="font-medium">Then:</span> {getActionDescription(auto)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleOpenEditor(auto)} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-600">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button onClick={() => onDeleteAutomation(auto.id!)} className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            
            {isEditorOpen && (
                <AutomationEditor
                    existingAutomation={editingAutomation}
                    onSave={handleSave}
                    onCancel={() => setIsEditorOpen(false)}
                />
            )}
        </>
    );
};

export default AutomationPage;
