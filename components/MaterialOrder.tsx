import React, { useState, useEffect } from 'react';
import { EstimateRecord } from '../lib/db.ts';

export interface OnHandInventory {
    ocSets: number;
    ccSets: number;
}

interface MaterialOrderProps {
    soldJobData: EstimateRecord | null;
    onHandInventory: OnHandInventory;
    setOnHandInventory: React.Dispatch<React.SetStateAction<OnHandInventory>>;
}

interface RunningTotals {
    totalOcSets: number;
    totalCcSets: number;
    totalOcCost: number;
    totalCcCost: number;
    grossRevenue: number;
}

const SOLD_STORAGE_KEY = 'materialInventorySold';
const ON_HAND_STORAGE_KEY = 'materialInventoryOnHand';

// Type guards to validate data from localStorage
function isOnHandInventory(obj: any): obj is OnHandInventory {
    return obj && typeof obj.ocSets === 'number' && typeof obj.ccSets === 'number';
}

function fmtCurrency(n: number) {
    if (Number.isNaN(n) || !Number.isFinite(n)) return "$0.00";
    return n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });
}

const MaterialOrder: React.FC<MaterialOrderProps> = ({ soldJobData, onHandInventory, setOnHandInventory }) => {
    const [totals, setTotals] = useState<RunningTotals>({ totalOcSets: 0, totalCcSets: 0, totalOcCost: 0, totalCcCost: 0, grossRevenue: 0 });
    const [lastAddedJob, setLastAddedJob] = useState<{ number: string, name: string, oc: number, cc: number, ocCost: number, ccCost: number, revenue: number } | null>(null);

    // Load initial data from localStorage on component mount
    useEffect(() => {
        try {
            // Load sold totals
            const savedTotals = localStorage.getItem(SOLD_STORAGE_KEY);
            if (savedTotals) {
                const parsed = JSON.parse(savedTotals);
                setTotals({
                    totalOcSets: parsed.totalOcSets || 0,
                    totalCcSets: parsed.totalCcSets || 0,
                    totalOcCost: parsed.totalOcCost || 0,
                    totalCcCost: parsed.totalCcCost || 0,
                    grossRevenue: parsed.grossRevenue || 0,
                });
            }
            // Load on-hand inventory
            const savedOnHand = localStorage.getItem(ON_HAND_STORAGE_KEY);
            if (savedOnHand) {
                const parsed = JSON.parse(savedOnHand);
                if (isOnHandInventory(parsed)) {
                    setOnHandInventory(parsed);
                }
            }
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        }
    }, [setOnHandInventory]);

    // Update totals when a new job is marked as sold
    useEffect(() => {
        if (soldJobData?.calcData && soldJobData?.costsData && soldJobData.estimateNumber) {
            const { ocSets, ccSets } = soldJobData.calcData;
            const { ocCostPerSet, ccCostPerSet, finalQuote } = soldJobData.costsData;
            const customerName = soldJobData.calcData.customer?.name || 'N/A';
            
            if (lastAddedJob?.number !== soldJobData.estimateNumber) {
                const jobOcCost = (ocSets || 0) * (ocCostPerSet || 0);
                const jobCcCost = (ccSets || 0) * (ccCostPerSet || 0);

                const newTotals = {
                    totalOcSets: totals.totalOcSets + (ocSets || 0),
                    totalCcSets: totals.totalCcSets + (ccSets || 0),
                    totalOcCost: totals.totalOcCost + jobOcCost,
                    totalCcCost: totals.totalCcCost + jobCcCost,
                    grossRevenue: totals.grossRevenue + (finalQuote || 0),
                };
                setTotals(newTotals);
                localStorage.setItem(SOLD_STORAGE_KEY, JSON.stringify(newTotals));
                setLastAddedJob({ 
                    number: soldJobData.estimateNumber, 
                    name: customerName,
                    oc: ocSets || 0, 
                    cc: ccSets || 0,
                    ocCost: jobOcCost,
                    ccCost: jobCcCost,
                    revenue: finalQuote || 0,
                });
            }
        }
    }, [soldJobData, totals, lastAddedJob]);

    // Save on-hand inventory to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(ON_HAND_STORAGE_KEY, JSON.stringify(onHandInventory));
    }, [onHandInventory]);

    const handleResetSoldJobTotals = () => {
        if (window.confirm("Are you sure you want to reset all 'sold job' running totals? This will not affect your on-hand inventory numbers.")) {
            localStorage.removeItem(SOLD_STORAGE_KEY);
            setTotals({ totalOcSets: 0, totalCcSets: 0, totalOcCost: 0, totalCcCost: 0, grossRevenue: 0 });
            setLastAddedJob(null);
        }
    };

    const handleResetOnHandInventory = () => {
        if (window.confirm("Are you sure you want to reset your on-hand inventory to zero? This action cannot be undone.")) {
            setOnHandInventory({ ocSets: 0, ccSets: 0 });
            localStorage.removeItem(ON_HAND_STORAGE_KEY);
        }
    };
    
    const handleResetAll = () => {
        if (window.confirm("DANGER: Are you sure you want to reset ALL material data to zero? This includes sold job commitments AND on-hand inventory.")) {
            // Reset sold jobs
            localStorage.removeItem(SOLD_STORAGE_KEY);
            setTotals({ totalOcSets: 0, totalCcSets: 0, totalOcCost: 0, totalCcCost: 0, grossRevenue: 0 });
            setLastAddedJob(null);
            // Reset on-hand inventory
            setOnHandInventory({ ocSets: 0, ccSets: 0 });
            localStorage.removeItem(ON_HAND_STORAGE_KEY);
        }
    };
    
    const handleOnHandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setOnHandInventory(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const neededOc = Math.max(0, totals.totalOcSets - onHandInventory.ocSets);
    const neededCc = Math.max(0, totals.totalCcSets - onHandInventory.ccSets);

    const card = "rounded-xl border border-slate-200 bg-white shadow-md p-4";
    const h2 = "text-lg font-semibold tracking-tight text-slate-800";
    const label = "text-sm font-medium text-slate-600";
    const input = "mt-1 w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <div className="mx-auto max-w-3xl p-4">
            {lastAddedJob && (
                <div className="mb-4 p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
                    <h3 className="font-semibold">✅ Job materials added to totals.</h3>
                    <p className="text-sm mt-1">
                        From job <strong>{lastAddedJob.number}</strong> ({lastAddedJob.name}): 
                        Added {lastAddedJob.oc.toFixed(2)} OC & {lastAddedJob.cc.toFixed(2)} CC sets.
                    </p>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`${card} bg-blue-50/50`}>
                    <h2 className={h2}>1. On-Hand Inventory</h2>
                    <p className="text-xs text-slate-500 mt-1">Enter your current stock levels.</p>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <label className="block">
                            <span className={label}>Open-Cell Sets</span>
                            <input type="number" name="ocSets" value={onHandInventory.ocSets} onChange={handleOnHandChange} className={input} min={0} />
                        </label>
                        <label className="block">
                            <span className={label}>Closed-Cell Sets</span>
                            <input type="number" name="ccSets" value={onHandInventory.ccSets} onChange={handleOnHandChange} className={input} min={0} />
                        </label>
                    </div>
                </div>

                 <div className={`${card} bg-green-50/50`}>
                    <h2 className={h2}>2. Materials to Order</h2>
                    <p className="text-xs text-slate-500 mt-1">Needed for all sold jobs.</p>
                     <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                        <div className="bg-white p-4 rounded-xl border">
                            <p className="text-sm font-medium text-slate-600">Open-Cell</p>
                            <p className="text-3xl font-bold text-green-700 mt-1">{neededOc.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border">
                            <p className="text-sm font-medium text-slate-600">Closed-Cell</p>
                            <p className="text-3xl font-bold text-green-700 mt-1">{neededCc.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${card} mt-4`}>
                <h2 className={h2}>Total Materials Committed</h2>
                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-100 p-4 rounded-xl">
                        <p className="text-sm font-medium text-slate-600">Total OC Sets</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{totals.totalOcSets.toFixed(2)}</p>
                        <p className="text-base font-semibold text-slate-700 mt-2">{fmtCurrency(totals.totalOcCost)}</p>
                    </div>
                    <div className="bg-slate-100 p-4 rounded-xl">
                        <p className="text-sm font-medium text-slate-600">Total CC Sets</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{totals.totalCcSets.toFixed(2)}</p>
                        <p className="text-base font-semibold text-slate-700 mt-2">{fmtCurrency(totals.totalCcCost)}</p>
                    </div>
                </div>
                 <div className="mt-4 pt-4 border-t">
                    <div className="flex flex-col gap-3">
                         <div>
                             <h3 className="text-base font-semibold text-slate-800">Reset Options</h3>
                             <p className="text-xs text-slate-500">These actions are permanent and cannot be undone.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={handleResetOnHandInventory} className="flex-grow rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-orange-600">
                                Reset On-Hand
                            </button>
                            <button onClick={handleResetSoldJobTotals} className="flex-grow rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-red-600">
                                Reset Sold Jobs
                            </button>
                            <button onClick={handleResetAll} className="flex-grow rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-black/80">
                                Reset All
                            </button>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default MaterialOrder;