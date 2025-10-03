import React, { useState, useEffect, useRef } from 'react';
import { Employee, TimeEntry } from './types.ts';
import { EstimateRecord, getActiveTimeEntry, saveTimeEntry } from '../lib/db.ts';

// Declare google for TypeScript
declare global {
  interface Window {
    google: any;
  }
}

interface TimeClockPageProps {
    employees: Employee[];
    jobs: EstimateRecord[];
    currentUser?: Employee;
}

const AdminTimeClockView: React.FC<Omit<TimeClockPageProps, 'currentUser'>> = ({ employees, jobs }) => {
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [pin, setPin] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const [activeModal, setActiveModal] = useState<'pin' | 'clockin' | 'options' | 'switch' | null>(null);
    const [activeEntries, setActiveEntries] = useState<Record<number, TimeEntry>>({});
    const [jobToClockIn, setJobToClockIn] = useState<number | ''>('');

    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any | null>(null);
    const [infoWindow, setInfoWindow] = useState<any | null>(null);
    const markersRef = useRef<Map<number, any>>(new Map());

    const availableJobs = jobs.filter(j => j.status === 'sold');

    useEffect(() => {
        const fetchAllActiveEntries = async () => {
            const entries: Record<number, TimeEntry> = {};
            for (const emp of employees) {
                if (emp.id) {
                    const activeEntry = await getActiveTimeEntry(emp.id);
                    if (activeEntry) {
                        entries[emp.id] = activeEntry;
                    }
                }
            }
            setActiveEntries(entries);
        };
        fetchAllActiveEntries();
    }, [employees]);

    useEffect(() => {
        const initMap = async () => {
            if (!mapRef.current || map) return; // Prevent re-initialization
            try {
                const { Map } = await window.google.maps.importLibrary("maps");
                const mapInstance = new Map(mapRef.current as HTMLDivElement, {
                    center: { lat: 39.8283, lng: -98.5795 },
                    zoom: 4,
                    mapId: 'TIME_CLOCK_MAP',
                    mapTypeId: 'hybrid',
                    tilt: 45,
                });
                setMap(mapInstance);
                const infoWindowInstance = new window.google.maps.InfoWindow();
                setInfoWindow(infoWindowInstance);
            } catch (e) {
                console.error("Error loading Google Maps for Time Clock", e);
            }
        };

        const checkAndInit = () => {
          if (window.google && window.google.maps) {
            initMap();
            return true;
          }
          return false;
        };
  
        if (!checkAndInit()) {
          const interval = setInterval(() => {
            if (checkAndInit()) {
              clearInterval(interval);
            }
          }, 100);
          return () => clearInterval(interval);
        }
    }, [map]);

    useEffect(() => {
        if (!map || !infoWindow) return;

        const updateMarkers = async () => {
            const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");
            const bounds = new window.google.maps.LatLngBounds();
            let locationsFound = 0;

            const activeEmployeeIds = new Set(Object.keys(activeEntries).map(Number));

            markersRef.current.forEach((marker, employeeId) => {
                if (!activeEmployeeIds.has(employeeId)) {
                    marker.map = null;
                    markersRef.current.delete(employeeId);
                }
            });

            for (const empIdStr in activeEntries) {
                const employeeId = Number(empIdStr);
                const entry = activeEntries[employeeId];
                const employee = employees.find(e => e.id === employeeId);

                if (entry.startLat && entry.startLng && employee) {
                    const position = { lat: entry.startLat, lng: entry.startLng };
                    locationsFound++;
                    bounds.extend(position);

                    if (markersRef.current.has(employeeId)) {
                        markersRef.current.get(employeeId)!.position = position;
                    } else {
                        const marker = new AdvancedMarkerElement({ map, position, title: employee.name });
                        marker.addListener('click', () => {
                            const job = getJobInfo(entry.jobId);
                            const content = `<div class="font-sans p-1"><h3 class="font-bold text-base text-slate-800">${employee.name}</h3><p class="text-sm text-slate-600">Job: ${job?.estimateNumber || 'N/A'}</p><p class="text-xs text-slate-500">Clocked In: ${new Date(entry.startTime).toLocaleTimeString()}</p></div>`;
                            infoWindow.setContent(content);
                            infoWindow.open(map, marker);
                        });
                        markersRef.current.set(employeeId, marker);
                    }
                }
            }
            
            if (locationsFound > 0) {
                if (locationsFound === 1) {
                    map.setCenter(bounds.getCenter());
                    map.setZoom(18);
                    map.setTilt(45);
                    map.setHeading(90);
                } else {
                    map.fitBounds(bounds);
                    map.setTilt(0);
                }
            } else {
                map.setCenter({ lat: 39.8283, lng: -98.5795 });
                map.setZoom(4);
                map.setTilt(0);
            }
        };
        updateMarkers();
    }, [activeEntries, map, infoWindow, employees]);

    const getJobInfo = (jobId: number) => jobs.find(j => j.id === jobId);

    const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm p-4";
    
    return (
      <div className="h-full flex flex-col">
        <div className="flex-grow p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 h-0">
            <div className="lg:col-span-1 overflow-y-auto space-y-3 p-1">
                <h2 className="text-xl font-bold dark:text-white px-2 mb-2">Team Status</h2>
                {employees.map(employee => {
                    const activeEntry = activeEntries[employee.id!];
                    const job = activeEntry ? getJobInfo(activeEntry.jobId) : null;
                    return (
                        <div key={employee.id} className={`${card} ${activeEntry ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg">{employee.name}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{employee.role}</p>
                                </div>
                                <div className={`flex items-center gap-2 text-xs font-semibold px-2 py-0.5 rounded-full ${activeEntry ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
                                    <div className={`w-2 h-2 rounded-full ${activeEntry ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                                    {activeEntry ? 'ON THE CLOCK' : 'CLOCKED OUT'}
                                </div>
                            </div>
                            {activeEntry && job && (
                                <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                                    <p className="text-sm"><strong>Job:</strong> {job.estimateNumber}</p>
                                    <p className="text-xs"><strong>Client:</strong> {job.calcData.customer?.name}</p>
                                    <p className="text-xs"><strong>Since:</strong> {new Date(activeEntry.startTime).toLocaleTimeString()}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="lg:col-span-2 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-600 h-full">
                <div ref={mapRef} className="w-full h-full" />
            </div>
        </div>
      </div>
    );
};

const SingleEmployeeTimeClock: React.FC<{ employee: Employee, jobs: EstimateRecord[] }> = ({ employee, jobs }) => {
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [jobToClockIn, setJobToClockIn] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableJobs = jobs.filter(j => j.status === 'sold');
    const activeJob = activeEntry ? jobs.find(j => j.id === activeEntry.jobId) : null;
    
    useEffect(() => {
        const fetchActiveEntry = async () => {
            setIsLoading(true);
            if (employee.id) {
                const entry = await getActiveTimeEntry(employee.id);
                setActiveEntry(entry || null);
            }
            setIsLoading(false);
        };
        fetchActiveEntry();
    }, [employee]);

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const getCurrentPosition = (): Promise<GeolocationPosition | null> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
        });
    };
    
    const handleClockIn = async () => {
        if (!jobToClockIn) {
            return showMessage('error', 'Please select a job to clock into.');
        }
        setIsSubmitting(true);
        const position = await getCurrentPosition();
        const newEntry: TimeEntry = {
            employeeId: employee.id!,
            jobId: jobToClockIn as number,
            startTime: new Date().toISOString(),
            startLat: position?.coords?.latitude,
            startLng: position?.coords?.longitude,
        };
        const newId = await saveTimeEntry(newEntry);
        setActiveEntry({ ...newEntry, id: newId });
        showMessage('success', `Successfully clocked in.`);
        setIsSubmitting(false);
    };

    const handleClockOut = async () => {
        if (!activeEntry) return;
        setIsSubmitting(true);
        const position = await getCurrentPosition();
        const durationHours = (new Date().getTime() - new Date(activeEntry.startTime).getTime()) / (1000 * 60 * 60);
        const updatedEntry: TimeEntry = {
            ...activeEntry,
            endTime: new Date().toISOString(),
            durationHours: parseFloat(durationHours.toFixed(2)),
            endLat: position?.coords?.latitude,
            endLng: position?.coords?.longitude,
        };
        await saveTimeEntry(updatedEntry);
        setActiveEntry(null);
        setJobToClockIn('');
        showMessage('success', `Successfully clocked out.`);
        setIsSubmitting(false);
    };

    if (isLoading) {
        return <div className="p-4 text-center">Loading...</div>;
    }

    const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm p-6";
    const input = "mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-4 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white";
    const label = "text-sm font-medium text-slate-600 dark:text-slate-300";

    return (
        <div className="mx-auto max-w-md p-4">
             <div className={card}>
                <div className="text-center">
                    <h1 className="text-2xl font-bold dark:text-white">Time Clock</h1>
                    <p className="text-lg text-slate-600 dark:text-slate-300">{employee.name}</p>
                </div>
                {message && (
                    <div className={`mt-4 p-3 text-sm text-center rounded-lg ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'}`}>
                        {message.text}
                    </div>
                )}
                {activeEntry ? (
                    <div className="mt-6 text-center">
                        <p className="text-lg font-semibold text-green-600 dark:text-green-400">You are CLOCKED IN.</p>
                        {activeJob && (
                           <div className="mt-2 text-sm">
                                <p><strong>Job:</strong> {activeJob.estimateNumber}</p>
                                <p className="text-slate-500 dark:text-slate-400"><strong>Client:</strong> {activeJob.calcData.customer?.name}</p>
                           </div>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Since {new Date(activeEntry.startTime).toLocaleTimeString()}</p>
                        <button onClick={handleClockOut} disabled={isSubmitting} className="mt-6 w-full rounded-lg bg-red-600 px-4 py-3 text-white font-semibold shadow-sm hover:bg-red-700 disabled:bg-slate-400">
                            {isSubmitting ? 'Processing...' : 'Clock Out'}
                        </button>
                    </div>
                ) : (
                    <div className="mt-6">
                        <p className="text-lg font-semibold text-center text-slate-700 dark:text-slate-200">You are CLOCKED OUT.</p>
                         <label className="block mt-4"><span className={label}>Select Job to Clock In</span>
                            <select value={jobToClockIn} onChange={e => setJobToClockIn(Number(e.target.value))} className={`${input} appearance-none`}>
                                <option value="">-- Select a Job --</option>
                                {availableJobs.map(j => <option key={j.id} value={j.id}>{j.estimateNumber} - {j.calcData.customer?.name}</option>)}
                            </select>
                        </label>
                        <button onClick={handleClockIn} disabled={isSubmitting || !jobToClockIn} className="mt-6 w-full rounded-lg bg-green-600 px-4 py-3 text-white font-semibold shadow-sm hover:bg-green-700 disabled:bg-slate-400">
                            {isSubmitting ? 'Processing...' : 'Clock In'}
                        </button>
                    </div>
                )}
             </div>
        </div>
    );
};

const TimeClockPage: React.FC<TimeClockPageProps> = ({ employees, jobs, currentUser }) => {
    if (currentUser) {
        return <SingleEmployeeTimeClock employee={currentUser} jobs={jobs} />;
    }
    return <AdminTimeClockView employees={employees} jobs={jobs} />;
};

export default TimeClockPage;