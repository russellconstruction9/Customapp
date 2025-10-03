

import React, { useState, useEffect } from 'react';
import { Automation, TriggerType, ActionType, Action } from './types.ts';
import { JobStatus } from '../lib/db.ts';

interface AutomationEditorProps {
    existingAutomation: Automation | null;
    onSave: (automation: Omit<Automation, 'id'> | Automation) => void;
    onCancel: () => void;
}

const EMPTY_AUTOMATION: Omit<Automation, 'id'> = {
    name: '',
    trigger_type: 'new_customer',
    trigger_config: {},
    actions: [{
        id: Date.now(),
        action_type: 'create_task',
        action_config: {},
    }],
    is_enabled: true,
};

const JOB_STATUSES: JobStatus[] = ['estimate', 'sold', 'invoiced', 'paid'];

const AutomationEditor: React.FC<AutomationEditorProps> = ({ existingAutomation, onSave, onCancel }) => {
    const [automation, setAutomation] = useState(existingAutomation || EMPTY_AUTOMATION);

    useEffect(() => {
        setAutomation(existingAutomation || EMPTY_AUTOMATION);
    }, [existingAutomation]);
    
    const handleFieldChange = <T extends keyof Automation>(field: T, value: Automation[T]) => {
        setAutomation(prev => ({...prev, [field]: value}));
    };
    
    const handleConfigChange = <T extends 'trigger_config'>(configType: T, field: keyof Automation[T], value: any) => {
        setAutomation(prev => ({
            ...prev,
            [configType]: { ...prev[configType], [field]: value }
        }));
    };

    const handleActionChange = (actionId: number, field: 'action_type', value: ActionType) => {
        setAutomation(prev => ({
            ...prev,
            actions: prev.actions.map(action => {
                if (action.id === actionId) {
                    return { ...action, [field]: value, action_config: {} }; // Reset config when type changes
                }
                return action;
            })
        }));
    };
    
    const handleActionConfigChange = (actionId: number, configField: keyof Action['action_config'], value: any) => {
        setAutomation(prev => ({
            ...prev,
            actions: prev.actions.map(action => {
                if (action.id === actionId) {
                    return {
                        ...action,
                        action_config: {
                            ...action.action_config,
                            [configField]: value
                        }
                    };
                }
                return action;
            })
        }));
    };

    const addAction = () => {
        const newAction: Action = {
            id: Date.now(),
            action_type: 'create_task',
            action_config: {}
        };
        setAutomation(prev => ({
            ...prev,
            actions: [...(prev.actions || []), newAction]
        }));
    };

    const removeAction = (actionId: number) => {
        setAutomation(prev => ({
            ...prev,
            actions: prev.actions.filter(action => action.id !== actionId)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(automation);
    };

    const labelClass = "text-sm font-medium text-slate-600 dark:text-slate-300";
    const inputClass = "mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white";
    const selectClass = `${inputClass} appearance-none`;

    const renderActionConfig = (action: Action) => {
        switch (action.action_type) {
            case 'webhook':
                return (
                    <label className="block mt-2">
                        <span className={labelClass}>Webhook URL</span>
                        <input type="url" value={action.action_config.url || ''} onChange={e => handleActionConfigChange(action.id, 'url', e.target.value)} className={inputClass} placeholder="https://..." required />
                    </label>
                );
            case 'create_task':
                return (
                    <div className="mt-2 space-y-2">
                        <label className="block">
                            <span className={labelClass}>Task Title</span>
                            <input type="text" value={action.action_config.task_title || ''} onChange={e => handleActionConfigChange(action.id, 'task_title', e.target.value)} className={inputClass} required />
                        </label>
                        <label className="block">
                            <span className={labelClass}>Task Description (Optional)</span>
                            <textarea value={action.action_config.task_description || ''} onChange={e => handleActionConfigChange(action.id, 'task_description', e.target.value)} rows={2} className={inputClass}></textarea>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You can use placeholders like [customer_name], [job_number], etc.</p>
                        </label>
                    </div>
                );
            case 'send_email':
                return (
                    <div className="mt-2 space-y-2">
                        <label className="block">
                            <span className={labelClass}>Email Subject</span>
                            <input type="text" value={action.action_config.email_subject || ''} onChange={e => handleActionConfigChange(action.id, 'email_subject', e.target.value)} className={inputClass} required />
                        </label>
                        <label className="block">
                            <span className={labelClass}>Email Body</span>
                            <textarea value={action.action_config.email_body || ''} onChange={e => handleActionConfigChange(action.id, 'email_body', e.target.value)} rows={4} className={inputClass}></textarea>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Placeholders available: [customer_name], [job_number], [job_value].</p>
                        </label>
                    </div>
                );
            case 'update_inventory':
                return (
                     <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-md">
                        <p className="text-sm text-slate-700 dark:text-slate-200">This action will automatically deduct the required open-cell and closed-cell foam sets for the job from your inventory.</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Requires items named "Open-Cell Set" and "Closed-Cell Set" in your inventory.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
            <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400">&times;</button>
                <form onSubmit={handleSubmit}>
                    <h2 className="text-xl font-bold dark:text-white">{existingAutomation ? 'Edit Automation' : 'Create Automation'}</h2>
                    <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        <label className="block">
                            <span className={labelClass}>Automation Name</span>
                            <input type="text" value={automation.name} onChange={e => handleFieldChange('name', e.target.value)} className={inputClass} required />
                        </label>
                        
                        <div className="p-4 border rounded-lg border-slate-200 dark:border-slate-600">
                            <h3 className="font-semibold text-lg">When...</h3>
                            <label className="block mt-2">
                                <span className={labelClass}>This happens (Trigger)</span>
                                <select value={automation.trigger_type} onChange={e => handleFieldChange('trigger_type', e.target.value as TriggerType)} className={selectClass}>
                                    <option value="new_customer">A new customer is created</option>
                                    <option value="job_status_updated">A job's status is updated</option>
                                </select>
                            </label>
                            {automation.trigger_type === 'job_status_updated' && (
                                <label className="block mt-2">
                                    <span className={labelClass}>Condition: Status becomes</span>
                                    <select value={automation.trigger_config.to_status || ''} onChange={e => handleConfigChange('trigger_config', 'to_status', e.target.value)} className={selectClass}>
                                        <option value="">-- Select Status --</option>
                                        {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </label>
                            )}
                        </div>

                        <div className="p-4 border rounded-lg border-slate-200 dark:border-slate-600">
                            <h3 className="font-semibold text-lg">Then...</h3>
                             <div className="space-y-4 mt-2">
                                {automation.actions?.map((action, index) => (
                                    <div key={action.id} className="p-3 border rounded-md border-slate-200 dark:border-slate-500 bg-slate-50 dark:bg-slate-700/50 relative">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-semibold">Action {index + 1}</h4>
                                            {automation.actions.length > 1 && (
                                                <button type="button" onClick={() => removeAction(action.id)} className="text-red-500 font-bold text-lg leading-none p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">&times;</button>
                                            )}
                                        </div>
                                        <label className="block">
                                            <span className={labelClass}>Do this</span>
                                            <select value={action.action_type} onChange={e => handleActionChange(action.id, 'action_type', e.target.value as ActionType)} className={selectClass}>
                                                <option value="create_task">Create a new task</option>
                                                <option value="send_email">Send an email</option>
                                                <option value="update_inventory">Update inventory stock</option>
                                                <option value="add_to_schedule">Add job to schedule</option>
                                                <option value="webhook">Trigger a webhook</option>
                                            </select>
                                        </label>
                                        {renderActionConfig(action)}
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addAction} className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                + Add another action
                            </button>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-between items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={automation.is_enabled} onChange={e => handleFieldChange('is_enabled', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className={labelClass}>Enabled</span>
                        </label>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={onCancel}>Cancel</button>
                            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700">Save Automation</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AutomationEditor;