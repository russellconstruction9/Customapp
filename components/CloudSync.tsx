
import React, { useState, useRef, useEffect } from 'react';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CustomerInfo, CompanyInfo } from './EstimatePDF.tsx';
import type { EstimateRecord } from '../lib/db.ts';

interface CloudSyncProps {
    customers: CustomerInfo[];
    jobs: EstimateRecord[];
    companyInfo: CompanyInfo;
    getMcpClient: () => Promise<Client>;
}

const CloudSync: React.FC<CloudSyncProps> = ({ customers, jobs, companyInfo, getMcpClient }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState('');
    const [activeAction, setActiveAction] = useState<'sheets' | 'docs' | 'backup' | 'email' | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const isLoading = activeAction !== null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const showStatus = (message: string, duration: number = 4000) => {
        setStatus(message);
        if (duration > 0) {
            setTimeout(() => setStatus(''), duration);
        }
    };

    const handleBackupToDrive = async () => {
        setActiveAction('backup');
        showStatus('Connecting to server...', 0);

        try {
            const client = await getMcpClient();
            const timestamp = new Date().toISOString().split('T')[0];

            showStatus('Backing up customers...', 0);
            const customerJson = JSON.stringify(customers, null, 2);
            await client.callTool({
                name: "google_drive_create_file_from_text",
                arguments: {
                    instructions: "Create a new file in Google Drive with the provided title and content.",
                    title: `customers-backup-${timestamp}.json`,
                    content: customerJson,
                },
            });

            showStatus('Backing up jobs...', 0);
            const jobsForBackup = jobs.map(job => {
                const { estimatePdf, materialOrderPdf, invoicePdf, ...rest } = job;
                return rest;
            });
            const jobsJson = JSON.stringify(jobsForBackup, null, 2);
            await client.callTool({
                name: "google_drive_create_file_from_text",
                arguments: {
                    instructions: "Create a new file in Google Drive with the provided title and content.",
                    title: `jobs-backup-${timestamp}.json`,
                    content: jobsJson,
                },
            });

            showStatus('✅ Backup complete!');
            setIsOpen(false);

        } catch (error) {
            console.error("Backup failed:", error);
            showStatus('❌ Backup failed. Check console.');
        } finally {
            setActiveAction(null);
        }
    };
    
    const handleExportToSheets = async () => {
        setActiveAction('sheets');
        showStatus('Connecting to server...', 0);
        try {
            const client = await getMcpClient();
            showStatus('Preparing data for Sheets...', 0);

            const dataForSheet = jobs.map(job => {
                const customer = customers.find(c => c.id === job.customerId);
                return {
                    "Estimate Number": job.estimateNumber,
                    "Customer Name": customer?.name || 'N/A',
                    "Customer Address": customer?.address || 'N/A',
                    "Status": job.status,
                    "Creation Date": new Date(job.createdAt).toLocaleDateString(),
                    "Quote Amount": job.costsData.finalQuote,
                    "Total Board Feet": job.calcData.totalBoardFeetWithWaste,
                    "Open Cell Sets": Number(job.calcData.ocSets.toFixed(2)),
                    "Closed Cell Sets": Number(job.calcData.ccSets.toFixed(2)),
                };
            });

            if (dataForSheet.length === 0) {
                showStatus('No jobs to export.');
                setActiveAction(null);
                return;
            }

            const jsonData = JSON.stringify(dataForSheet);
            const timestamp = new Date().toISOString().split('T')[0];

            showStatus('Creating Google Sheet...', 0);
            await client.callTool({
                name: "google_sheets_create_spreadsheet_from_json",
                arguments: {
                    instructions: "Create a new Google Sheet from the provided JSON data and give it the specified title.",
                    title: `Jobs-Export-${timestamp}`,
                    json_data: jsonData,
                },
            });

            showStatus('✅ Export to Sheets complete!');
            setIsOpen(false);
        } catch (error) {
            console.error("Export to Sheets failed:", error);
            showStatus('❌ Export failed. Check console.');
        } finally {
            setActiveAction(null);
        }
    };
    
    const generateReportContent = () => {
        const totalJobs = jobs.length;
        const totalRevenue = jobs
            .filter(j => j.status === 'paid')
            .reduce((sum, j) => sum + (j.costsData?.finalQuote || 0), 0);
        const outstandingRevenue = jobs
            .filter(j => j.status === 'invoiced')
            .reduce((sum, j) => sum + (j.costsData?.finalQuote || 0), 0);
        const totalCustomers = customers.length;
        const timestamp = new Date().toLocaleString();

        return `
# Business Summary Report

Generated on: ${timestamp}

## Key Metrics
- **Total Customers:** ${totalCustomers}
- **Total Jobs Logged:** ${totalJobs}
- **Total Revenue (Paid):** $${totalRevenue.toFixed(2)}
- **Outstanding A/R (Invoiced):** $${outstandingRevenue.toFixed(2)}

## Recent Jobs
${jobs.slice(0, 5).map(job => {
    const customer = customers.find(c => c.id === job.customerId);
    return `- ${job.estimateNumber} for ${customer?.name || 'N/A'} - Status: ${job.status} - $${job.costsData.finalQuote.toFixed(2)}`;
}).join('\n')}
        `;
    };

    const handleCreateDocReport = async () => {
        setActiveAction('docs');
        showStatus('Connecting to server...', 0);
        try {
            const client = await getMcpClient();
            showStatus('Generating report...', 0);
            const reportContent = generateReportContent();
            const docTitle = `Business-Summary-Report-${new Date().toISOString().split('T')[0]}`;
            
            showStatus('Creating Google Doc...', 0);
            await client.callTool({
                name: "google_docs_create_document_from_text",
                arguments: {
                    instructions: "Create a new Google Doc with the provided title and content.",
                    title: docTitle,
                    content: reportContent,
                },
            });

            showStatus('✅ Report created!');
            setIsOpen(false);
        } catch (error) {
            console.error("Doc report failed:", error);
            showStatus('❌ Report creation failed.');
        } finally {
            setActiveAction(null);
        }
    };
    
    const handleEmailReport = async () => {
        if (!companyInfo?.email) {
            showStatus('Company email not set in settings.');
            return;
        }
        setActiveAction('email');
        showStatus('Connecting to server...', 0);
        try {
            const client = await getMcpClient();
            showStatus('Generating email content...', 0);
            const reportContent = generateReportContent();
            const emailSubject = `Business Summary Report - ${new Date().toLocaleDateString()}`;

            showStatus('Sending email...', 0);
            await client.callTool({
                name: "gmail_send_email",
                arguments: {
                    instructions: "Send an email to the specified recipient with the given subject and body.",
                    to: companyInfo.email,
                    subject: emailSubject,
                    body: reportContent,
                },
            });

            showStatus('✅ Email sent!');
            setIsOpen(false);
        } catch (error) {
            console.error("Email report failed:", error);
            showStatus('❌ Failed to send email.');
        } finally {
            setActiveAction(null);
        }
    };
    
    const ActionButton: React.FC<{
        onClick: () => void;
        actionType: typeof activeAction;
        label: string;
        ariaLabel: string;
        children: React.ReactNode;
    }> = ({ onClick, actionType, label, ariaLabel, children }) => (
        <div className="flex items-center gap-3">
            <span className="bg-slate-900/70 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg">
                {isLoading && activeAction === actionType ? status : label}
            </span>
            <button
                onClick={onClick}
                disabled={isLoading}
                className="w-12 h-12 bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-full shadow-md flex items-center justify-center transition-transform transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={ariaLabel}
            >
                {isLoading && activeAction === actionType ? (
                    <svg className="animate-spin h-6 w-6 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                    children
                )}
            </button>
        </div>
    );

    return (
        <div ref={menuRef} className="fixed bottom-24 right-[5.5rem] z-[9998] flex flex-col items-end">
            {status && !isOpen && (
                 <div className="bg-slate-900/80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg mb-2 text-center animate-fade-in">
                    {status}
                </div>
            )}

            {isOpen && (
                <div className="flex flex-col items-end gap-3 mb-3 animate-fade-in-up">
                    <ActionButton onClick={handleExportToSheets} actionType="sheets" label="Export to Sheets" ariaLabel="Export Jobs to Google Sheets">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M4 4h16v16H4V4zm0 4h16M4 12h16M4 16h16" /></svg>
                    </ActionButton>
                    <ActionButton onClick={handleCreateDocReport} actionType="docs" label="Create Doc Report" ariaLabel="Create Report in Google Docs">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </ActionButton>
                    <ActionButton onClick={handleEmailReport} actionType="email" label="Email Summary" ariaLabel="Email Summary Report">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </ActionButton>
                     <ActionButton onClick={handleBackupToDrive} actionType="backup" label="Backup to Drive" ariaLabel="Backup Data to Google Drive">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2m2-12v10a2 2 0 002 2h4a2 2 0 002-2V4m-6 0h6m-6 6h6" /></svg>
                    </ActionButton>
                </div>
            )}
            
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-slate-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110"
                aria-label={isOpen ? "Close Cloud Menu" : "Open Cloud Menu"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
            </button>
        </div>
    );
};

export default CloudSync;