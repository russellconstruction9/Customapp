import React from 'react';
import { Page } from '../App.tsx';

interface ScheduleViewToggleProps {
    currentView: 'calendar' | 'gantt';
    onNavigate: (page: Page) => void;
}

const ScheduleViewToggle: React.FC<ScheduleViewToggleProps> = ({ currentView, onNavigate }) => {
    
    const baseClass = "flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors";
    const activeClass = "bg-blue-600 text-white";
    const inactiveClass = "text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-500/50";

    return (
        <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-900/50 rounded-lg">
            <button 
                onClick={() => onNavigate('schedule')}
                className={`${baseClass} ${currentView === 'calendar' ? activeClass : inactiveClass}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Calendar
            </button>
            <button 
                onClick={() => onNavigate('gantt')}
                className={`${baseClass} ${currentView === 'gantt' ? activeClass : inactiveClass}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Gantt
            </button>
        </div>
    );
};

export default ScheduleViewToggle;
