import React, { useMemo } from 'react';
import { Job } from './types.ts';
import TaskItem from './TaskItem.tsx';
import { toDate, addDays, diffInDays, dateLabel } from './utils.ts';

interface GanttChartProps {
  jobs: Job[];
  pxPerDay: number;
  chartStartDate: Date;
  chartEndDate: Date;
  onUpdateJob: (updatedJob: Job, originalStart: string) => void;
  onSelectJob: (id: string) => void;
}

const ROW_HEIGHT = 40; // in px
const HEADER_HEIGHT = 30; // in px

const GanttChart: React.FC<GanttChartProps> = ({
  jobs,
  pxPerDay,
  chartStartDate,
  chartEndDate,
  onUpdateJob,
  onSelectJob,
}) => {
  const { days, gridWidth } = useMemo(() => {
    const days: Date[] = [];
    // Normalize to a Date to avoid utils ambiguity
    let currentDate = new Date(chartStartDate);
    const end = new Date(chartEndDate);
    while (currentDate <= end) {
      days.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1); // addDays(Date, number) expected
    }
    const gridWidth = days.length * pxPerDay;
    return { days, gridWidth };
  }, [chartStartDate, chartEndDate, pxPerDay]);

  const jobPositions = useMemo(() => {
    const positions: Record<string, { top: number }> = {};
    jobs.forEach((job, index) => {
      positions[job.id] = { top: index * ROW_HEIGHT };
    });
    return positions;
  }, [jobs]);

  const overlappingIds = useMemo(() => {
    const overlaps = new Set<string>();
    if (jobs.length < 2) return overlaps;

    for (let i = 0; i < jobs.length; i++) {
      for (let j = i + 1; j < jobs.length; j++) {
        const jobA = jobs[i];
        const jobB = jobs[j];
        const startA = toDate(jobA.start);
        const endA = toDate(jobA.end);
        const startB = toDate(jobB.start);
        const endB = toDate(jobB.end);

        // Overlap if ranges intersect
        if (startA <= endB && startB <= endA) {
          overlaps.add(jobA.id);
          overlaps.add(jobB.id);
        }
      }
    }
    return overlaps;
  }, [jobs]);

  return (
    <div
      className="relative bg-white dark:bg-slate-700 shadow-lg rounded-lg border border-slate-200 dark:border-slate-600"
      style={{ height: jobs.length * ROW_HEIGHT + HEADER_HEIGHT + 20 }}
    >
      {/* Date Header */}
      <div
        className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-600/50 border-b border-slate-200 dark:border-slate-600"
        style={{ width: gridWidth, height: HEADER_HEIGHT }}
      >
        <div className="flex">
          {days.map((day) => (
            <div
              key={day.toISOString()} // stable key
              className="flex-shrink-0 text-center text-xs font-medium text-slate-500 dark:text-slate-300 border-r border-slate-200 dark:border-slate-500"
              style={{ width: pxPerDay }}
            >
              {day.getDate() === 1 ? day.toLocaleDateString('default', { month: 'short' }) : ''}{' '}
              {dateLabel(day)}
            </div>
          ))}
        </div>
      </div>

      {/* Grid and Content */}
      <div className="relative" style={{ width: gridWidth, height: jobs.length * ROW_HEIGHT }}>
        {/* Vertical Grid Columns */}
        {days.map((day, index) => (
          <div
            key={`col-${day.toISOString()}`}
            className="absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-600"
            style={{ left: index * pxPerDay, width: pxPerDay }}
          />
        ))}

        {/* Horizontal Grid Lines */}
        {jobs.map((_, index) => (
          <div
            key={`row-${index}`}
            className="absolute left-0 right-0 border-b border-slate-100 dark:border-slate-600"
            style={{ top: (index + 1) * ROW_HEIGHT }}
          />
        ))}

        {/* Task Items */}
        {jobs.map((job, index) => (
          <TaskItem
            key={job.id}
            job={job}
            rowIndex={index}
            pxPerDay={pxPerDay}
            chartStartDate={chartStartDate}
            rowHeight={ROW_HEIGHT}
            onUpdate={onUpdateJob}
            onSelect={onSelectJob}
            isOverlapping={overlappingIds.has(job.id)}
          />
        ))}

        {/* Dependency Lines (SVG Overlay) */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" className="dark:fill-slate-400" />
            </marker>
          </defs>
          {jobs.map((job) =>
            (job.links ?? []).map((linkId) => {
              const predecessor = jobs.find((j) => j.id === linkId);
              if (!predecessor) return null;

              const predPos = jobPositions[predecessor.id];
              const jobPos = jobPositions[job.id];
              if (!predPos || !jobPos) return null;

              // Normalize to Date before diffing
              const predEnd = toDate(predecessor.end);
              const jobStart = toDate(job.start);

              const startOffset =
                diffInDays(chartStartDate, predEnd) * pxPerDay + (pxPerDay - 2);
              const endOffset =
                diffInDays(chartStartDate, jobStart) * pxPerDay + 2;

              const y1 = predPos.top + ROW_HEIGHT / 2;
              const y2 = jobPos.top + ROW_HEIGHT / 2;

              const curve = `M ${startOffset} ${y1} C ${startOffset + pxPerDay} ${y1}, ${endOffset - pxPerDay} ${y2}, ${endOffset} ${y2}`;

              return (
                <path
                  key={`${linkId}-${job.id}`}
                  d={curve}
                  stroke="#64748b"
                  className="dark:stroke-slate-400"
                  strokeWidth="1.5"
                  fill="none"
                  markerEnd="url(#arrow)"
                />
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
};

export default GanttChart;