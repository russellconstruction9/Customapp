



import React, { useState, useEffect } from 'react';
import { CompanyInfo } from './EstimatePDF.tsx';
import Logo from './Logo.tsx';
import { AppSettings, Theme } from '../App.tsx';
import { CostSettings } from '../lib/processing.ts';

interface SettingsProps {
    onSave: (info: CompanyInfo, settings: AppSettings) => void;
    currentInfo?: CompanyInfo | null;
    appSettings: AppSettings;
    isInitialSetup?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ onSave, currentInfo, appSettings: initialAppSettings, isInitialSetup = false }) => {
    const [info, setInfo] = useState<CompanyInfo>(currentInfo || {
        name: '',
        address: '',
        phone: '',
        email: '',
    });
    
    const [appSettings, setAppSettings] = useState<AppSettings>(initialAppSettings);
    
    useEffect(() => {
        setAppSettings(initialAppSettings);
    }, [initialAppSettings]);

    const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInfo(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSettingsChange = (field: keyof AppSettings, value: any) => {
        setAppSettings(prev => ({...prev, [field]: value}));
    }
    
    const handleYieldsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAppSettings(prev => ({
            ...prev,
            defaultYields: { ...prev.defaultYields, [name]: parseFloat(value) || 0 }
        }));
    }
    
    const handleCostsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         const { name, value } = e.target;
         setAppSettings(prev => ({
            ...prev,
            defaultCosts: { ...prev.defaultCosts, [name]: parseFloat(value) || 0 }
         }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(info, appSettings);
    };

    const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm p-6";
    const h2 = "text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100";
    const label = "text-sm font-medium text-slate-600 dark:text-slate-300";
    const input = "mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-4 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white";
    const small = "text-xs text-slate-500 dark:text-slate-400";
    
    const ThemeButton: React.FC<{ value: Theme, label: string, icon: React.ReactElement }> = ({ value, label, icon }) => (
        <button
            type="button"
            onClick={() => handleSettingsChange('theme', value)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors w-full flex flex-col items-center justify-center gap-1 h-20 ${
                appSettings.theme === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    const Wrapper: React.FC<{children: React.ReactNode}> = ({ children }) => {
        if (isInitialSetup) {
            return (
                <div className="min-h-screen bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-4">
                    <div className="w-full max-w-md">{children}</div>
                </div>
            );
        }
        return <div className="p-4 mx-auto max-w-3xl space-y-4">{children}</div>;
    }

    return (
        <Wrapper>
            {isInitialSetup && (
                <>
                    <Logo />
                    <div className="mb-6 text-center -mt-8">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome!</h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Enter your company info to get started. This will be saved for all future estimates.
                        </p>
                    </div>
                </>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className={card}>
                    <h2 className={h2}>{isInitialSetup ? 'Your Company Details' : 'Company Details'}</h2>
                    <div className="mt-4 space-y-4">
                        <label className="block"><span className={label}>Company Name</span><input type="text" name="name" value={info.name} onChange={handleInfoChange} className={input} required /></label>
                        <label className="block"><span className={label}>Address</span><input type="text" name="address" value={info.address} onChange={handleInfoChange} className={input} required /></label>
                        <label className="block"><span className={label}>Phone</span><input type="tel" name="phone" value={info.phone} onChange={handleInfoChange} className={input} required /></label>
                        <label className="block"><span className={label}>Email</span><input type="email" name="email" value={info.email} onChange={handleInfoChange} className={input} required /></label>
                    </div>
                </div>
                
                {!isInitialSetup && (
                    <>
                        <div className={card}>
                            <h2 className={h2}>Appearance</h2>
                            <div className="mt-4">
                                <span className={label}>Theme</span>
                                <div className="mt-2 grid grid-cols-3 gap-3">
                                    <ThemeButton value="light" label="Light" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
                                    <ThemeButton value="dark" label="Dark" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>} />
                                    <ThemeButton value="system" label="System" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
                                </div>
                            </div>
                        </div>

                        <div className={card}>
                             <h2 className={h2}>Defaults</h2>
                             <div className="mt-4 space-y-4">
                                <div>
                                    <h3 className="font-medium text-slate-700 dark:text-slate-200">Material Yields</h3>
                                    <div className="mt-2 grid grid-cols-2 gap-3">
                                        {/* FIX: Corrected malformed JSX for the 'Open-cell yield' input, which had a misplaced event handler and an invalid attribute on a child span. */}
                                        <label className="block"><span className={label}>Open-cell yield</span><input type="number" min={1} step={1} className={input} name="openCellYield" value={appSettings.defaultYields.openCellYield} onChange={handleYieldsChange} /><span className={small}>bf/set</span></label>
                                        <label className="block"><span className={label}>Closed-cell yield</span><input type="number" min={1} step={1} className={input} name="closedCellYield" value={appSettings.defaultYields.closedCellYield} onChange={handleYieldsChange} /><span className={small}>bf/set</span></label>
                                    </div>
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
                                    <h3 className="font-medium text-slate-700 dark:text-slate-200">Job Costing</h3>
                                    <div className="mt-2 grid grid-cols-2 gap-3">
                                        <label className="block"><span className={label}>OC Cost/Set ($)</span><input type="number" min={0} className={input} name="ocCostPerSet" value={appSettings.defaultCosts.ocCostPerSet} onChange={handleCostsChange} /></label>
                                        <label className="block"><span className={label}>OC Markup (%)</span><input type="number" min={0} className={input} name="ocMarkup" value={appSettings.defaultCosts.ocMarkup} onChange={handleCostsChange} /></label>
                                        <label className="block"><span className={label}>CC Cost/Set ($)</span><input type="number" min={0} className={input} name="ccCostPerSet" value={appSettings.defaultCosts.ccCostPerSet} onChange={handleCostsChange} /></label>
                                        <label className="block"><span className={label}>CC Markup (%)</span><input type="number" min={0} className={input} name="ccMarkup" value={appSettings.defaultCosts.ccMarkup} onChange={handleCostsChange} /></label>
                                        <label className="block"><span className={label}>Labor Rate ($/hr)</span><input type="number" min={0} className={input} name="laborRate" value={appSettings.defaultCosts.laborRate} onChange={handleCostsChange} /></label>
                                        <label className="block"><span className={label}>Equipment Fee ($)</span><input type="number" min={0} className={input} name="equipmentFee" value={appSettings.defaultCosts.equipmentFee} onChange={handleCostsChange} /></label>
                                        <label className="block"><span className={label}>Overhead (%)</span><input type="number" min={0} className={input} name="overheadPercentage" value={appSettings.defaultCosts.overheadPercentage} onChange={handleCostsChange} /></label>
                                        <label className="block"><span className={label}>Sales Tax (%)</span><input type="number" min={0} className={input} name="salesTax" value={appSettings.defaultCosts.salesTax} onChange={handleCostsChange} /></label>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </>
                )}

                <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-semibold shadow hover:bg-blue-700 transition-colors">
                    {isInitialSetup ? 'Save & Enter Application' : 'Save Changes'}
                </button>
            </form>
        </Wrapper>
    );
};

export default Settings;