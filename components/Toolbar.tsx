import React from 'react';
import { Page } from '../App.tsx';
import ScheduleViewToggle from './ScheduleViewToggle.tsx';

interface ToolbarProps {
  onAddJob?: () => void;
  currentMonth: Date;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onGoToToday: () => void;
  onNavigate: (page: Page) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onAddJob,
  currentMonth,
  onNextMonth,
  onPreviousMonth,
  onGoToToday,
  onNavigate,
}) => {
  const monthYearLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white/80 dark:bg-slate-700/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-600/50 p-2 flex flex-col sm:flex-row items-center gap-4 sticky top-0 z-20">
      <div className="flex-grow flex items-center gap-2">
        <button onClick={onGoToToday} className="rounded-lg border border-slate-300 dark:border-slate-500 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
            Today
        </button>
        <div className="flex items-center gap-1">
            <button onClick={onPreviousMonth} aria-label="Previous month" className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
             <button onClick={onNextMonth} aria-label="Next month" className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 w-36 text-center sm:text-left">{monthYearLabel}</h2>
      </div>
      
      <ScheduleViewToggle currentView="calendar" onNavigate={onNavigate} />

      {onAddJob && (
        <button
            onClick={onAddJob}
            className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-semibold shadow hover:bg-blue-700 transition-colors"
        >
            + Add Job
        </button>
      )}
    </div>
  );
};

export default Toolbar;