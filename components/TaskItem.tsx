import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Job } from './types.ts';
import { toDate, addDays, diffInDays, fmtInput, darkenColor } from './utils.ts';

interface TaskItemProps {
  job: Job;
  rowIndex: number;
  pxPerDay: number;
  chartStartDate: Date;
  rowHeight: number;
  onUpdate: (updatedJob: Job, originalStart: string) => void;
  onSelect: (id: string) => void;
  isOverlapping: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ job, rowIndex, pxPerDay, chartStartDate, rowHeight, onUpdate, onSelect, isOverlapping }) => {
  const [dragState, setDragState] = useState<{ type: 'move' | 'resize-left' | 'resize-right'; initialMouseX: number, originalJob: Job } | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  
  const left = diffInDays(chartStartDate, toDate(job.start)) * pxPerDay;
  const duration = diffInDays(toDate(job.start), toDate(job.end)) + 1;
  const width = duration * pxPerDay;
  
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, type: 'move' | 'resize-left' | 'resize-right') => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.cursor = type === 'move' ? 'grabbing' : 'ew-resize';
    setDragState({
      type,
      initialMouseX: e.clientX,
      originalJob: job,
    });
  }, [job]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;
      
      const deltaX = e.clientX - dragState.initialMouseX;
      const dayDelta = Math.round(deltaX / pxPerDay);
      const { originalJob, type } = dragState;

      let newStart = toDate(originalJob.start);
      let newEnd = toDate(originalJob.end);

      if (type === 'move') {
        newStart = addDays(originalJob.start, dayDelta);
        newEnd = addDays(originalJob.end, dayDelta);
      } else if (type === 'resize-left') {
        newStart = addDays(originalJob.start, dayDelta);
        if (newStart > newEnd) newStart = newEnd;
      } else if (type === 'resize-right') {
        newEnd = addDays(originalJob.end, dayDelta);
        if (newEnd < newStart) newEnd = newStart;
      }
      
      if (itemRef.current) {
        const tempLeft = diffInDays(chartStartDate, newStart) * pxPerDay;
        const tempDuration = diffInDays(newStart, newEnd) + 1;
        const tempWidth = tempDuration * pxPerDay;
        itemRef.current.style.left = `${tempLeft}px`;
        itemRef.current.style.width = `${tempWidth}px`;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragState) return;

      document.body.style.cursor = 'default';
      const deltaX = e.clientX - dragState.initialMouseX;

      // Treat as a click if the mouse moved less than 5px
      if (Math.abs(deltaX) < 5 && dragState.type === 'move') { 
          onSelect(job.id);
          // Reset style in case of a tiny accidental drag
          if (itemRef.current) {
              itemRef.current.style.left = `${left}px`;
              itemRef.current.style.width = `${width}px`;
          }
          setDragState(null);
          return;
      }

      const dayDelta = Math.round(deltaX / pxPerDay);
      const { originalJob, type } = dragState;

      let finalStart = toDate(originalJob.start);
      let finalEnd = toDate(originalJob.end);

      if (type === 'move') {
        finalStart = addDays(originalJob.start, dayDelta);
        finalEnd = addDays(originalJob.end, dayDelta);
      } else if (type === 'resize-left') {
        finalStart = addDays(originalJob.start, dayDelta);
        if (finalStart > finalEnd) finalStart = finalEnd;
      } else { // resize-right
        finalEnd = addDays(originalJob.end, dayDelta);
        if (finalEnd < finalStart) finalEnd = finalStart;
      }
      
      const updatedJob = {
        ...job,
        start: fmtInput(finalStart),
        end: fmtInput(finalEnd),
      };

      onUpdate(updatedJob, originalJob.start);
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, pxPerDay, chartStartDate, onUpdate, onSelect, job, left, width]);
  
  const overlapClasses = isOverlapping ? 'ring-2 ring-offset-1 ring-red-500 dark:ring-offset-slate-700' : 'shadow-sm';

  return (
    <div
      ref={itemRef}
      className={`absolute group flex items-center h-8 rounded-md border text-white text-xs font-bold transition-shadow duration-100 ease-in-out ${overlapClasses}`}
      style={{
        left,
        width,
        top: rowIndex * rowHeight + (rowHeight - 32) / 2,
        backgroundColor: job.color,
        borderColor: darkenColor(job.color, 20),
        cursor: 'grab',
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-2 rounded-l-md cursor-ew-resize hover:bg-black/20 z-10"
        onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
        aria-label="Resize start date"
      />
      <span className="px-2 truncate pointer-events-none">{job.name}</span>
      <div 
        className="absolute right-0 top-0 bottom-0 w-2 rounded-r-md cursor-ew-resize hover:bg-black/20 z-10"
        onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
        aria-label="Resize end date"
      />
    </div>
  );
};

export default TaskItem;