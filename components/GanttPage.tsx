import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Job, EditingJob, Employee } from './types.ts';
import { toDate, addDays, diffInDays, minDate, maxDate, getMidpointDate } from './utils.ts';
import GanttChart from './GanttChart.tsx';
import JobEditorModal from './JobEditorModal.tsx';
import ScheduleViewToggle from './ScheduleViewToggle.tsx';
import { Page } from '../App.tsx';

// Custom hook to detect if the screen is mobile-sized
const useIsMobile = (breakpoint = 768): boolean => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return isMobile;
};


interface GanttPageProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  employees: Employee[];
  onNavigate: (page: Page) => void;
}

const GanttPage: React.FC<GanttPageProps> = ({ jobs, setJobs, employees, onNavigate }) => {
  const [pxPerDay, setPxPerDay] = useState(40);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const { earliestDate, latestDate, projectCenterDate } = useMemo(() => {
    if (jobs.length === 0) {
      const today = new Date();
      const earliest = addDays(today, -7);
      const latest = addDays(today, 21);
      return { 
        earliestDate: earliest, 
        latestDate: latest,
        projectCenterDate: getMidpointDate(earliest, latest)
      };
    }
    const allDates = jobs.flatMap(j => [toDate(j.start), toDate(j.end)]);
    const earliest = allDates.reduce(minDate);
    const latest = allDates.reduce(maxDate);
    return {
      earliestDate: earliest,
      latestDate: latest,
      projectCenterDate: getMidpointDate(earliest, latest),
    };
  }, [jobs]);

  const [chartStartDate, setChartStartDate] = useState(addDays(new Date(), -14));

  const centerOnJobs = useCallback(() => {
    const screenWidth = window.innerWidth;
    const projectDurationDays = Math.max(1, diffInDays(earliestDate, latestDate));
    
    // On mobile, calculate a zoom level that fits the project in about 1.5 screen widths
    const newPxPerDay = isMobile 
      ? Math.max(20, Math.min(60, (screenWidth * 1.5) / projectDurationDays))
      : 40; // Default for desktop
      
    setPxPerDay(newPxPerDay);

    // Calculate how many days fit on the screen
    const daysOnScreen = Math.floor(screenWidth / newPxPerDay);
    // Set the start date so the project's center is in the middle of the screen
    const newStartDate = addDays(projectCenterDate, -Math.floor(daysOnScreen / 2));
    setChartStartDate(newStartDate);
  }, [earliestDate, latestDate, projectCenterDate, isMobile]);

  // Effect to auto-center on initial load for mobile
  useEffect(() => {
    if (jobs.length > 0) {
      centerOnJobs();
    }
  }, [jobs, isMobile, centerOnJobs]);


  const chartEndDate = useMemo(() => addDays(chartStartDate, 90), [chartStartDate]);

  const handleUpdateJob = useCallback((updatedJob: Job, originalStart: string) => {
    setJobs(currentJobs => {
      const allUpdated = currentJobs.map(j => (j.id === updatedJob.id ? { ...updatedJob, links: updatedJob.links ?? [] } : j));
      const originalStartDate = toDate(originalStart);
      const newStartDate = toDate(updatedJob.start);
      const dayDelta = diffInDays(originalStartDate, newStartDate);

      if (dayDelta === 0) return allUpdated;

      return allUpdated.map(j => {
        if ((j.links ?? []).includes(updatedJob.id)) {
          const dependentStart = addDays(updatedJob.end, 1);
          const duration = diffInDays(j.start, j.end);
          return { ...j, start: toDate(dependentStart).toISOString().split('T')[0], end: addDays(dependentStart, duration).toISOString().split('T')[0] };
        }
        return j;
      });
    });
  }, [setJobs]);
  
  const handleSaveJob = useCallback((jobToSave: EditingJob) => {
      const normalized: Job = { ...(jobToSave as Job), links: (jobToSave as any).links ?? [], assignedTeam: (jobToSave as any).assignedTeam ?? [] };
      setJobs(updatedJobs => updatedJobs.map((j) => (j.id === normalized.id ? normalized : j)));
      setEditingJobId(null);
  }, [setJobs]);

  const handleDeleteJob = useCallback((jobId: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
        setJobs(currentJobs => 
            currentJobs
                .filter(job => job.id !== jobId)
                .map(job => ({
                    ...job,
                    links: (job.links ?? []).filter(linkId => linkId !== jobId) 
                }))
        );
        setEditingJobId(null);
    }
  }, [setJobs]);

  const handleMakeStandalone = useCallback((jobId: string) => {
    setJobs((prevJobs) => prevJobs.map((j) => (j.id === jobId ? { ...j, links: [] } : j)));
  }, [setJobs]);

  const editingJob = useMemo(() => jobs.find((j) => j.id === editingJobId), [jobs, editingJobId]);

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-800">
      <div className="bg-white/80 dark:bg-slate-700/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-600/50 p-2 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-1">
            <button onClick={() => setChartStartDate(addDays(chartStartDate, -14))} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 hidden sm:block">{'<<'}</button>
            <button onClick={() => setChartStartDate(addDays(chartStartDate, -7))} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">{'<'}</button>
            <span className="text-sm font-semibold w-24 text-center">{chartStartDate.toLocaleDateString()}</span>
            <button onClick={() => setChartStartDate(addDays(chartStartDate, 7))} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">{'>'}</button>
            <button onClick={() => setChartStartDate(addDays(chartStartDate, 14))} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 hidden sm:block">{'>>'}</button>
        </div>
        
        <ScheduleViewToggle currentView="gantt" onNavigate={onNavigate} />

        <div className="flex items-center gap-2">
            <button onClick={centerOnJobs} title="Center on Jobs" className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v4m0 0h-4m4 0l-5-5" />
                </svg>
            </button>
            <button onClick={() => setPxPerDay(p => Math.max(10, p - 5))} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">-</button>
            <span className="text-sm">Zoom</span>
            <button onClick={() => setPxPerDay(p => Math.min(100, p + 5))} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">+</button>
        </div>
      </div>
      <div className="flex-grow overflow-auto p-4">
        {jobs.length > 0 ? (
          <GanttChart
            jobs={jobs}
            pxPerDay={pxPerDay}
            chartStartDate={chartStartDate}
            chartEndDate={chartEndDate}
            onUpdateJob={handleUpdateJob}
            onSelectJob={setEditingJobId}
          />
        ) : (
           <div className="text-center p-10 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600">
             <h3 className="font-semibold text-lg">No Jobs Scheduled</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400">Go to the Calendar view to add jobs to the schedule.</p>
           </div>
        )}
      </div>
       {editingJob && (
        <JobEditorModal
          job={editingJob}
          allJobs={jobs}
          allEmployees={employees}
          onSave={handleSaveJob}
          onCancel={() => setEditingJobId(null)}
          onDelete={handleDeleteJob}
          onMakeStandalone={handleMakeStandalone}
        />
      )}
    </div>
  );
};

export default GanttPage;