import React, { useState, useRef, useEffect } from 'react';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CustomerInfo } from './EstimatePDF.tsx';
import type { EstimateRecord } from '../lib/db.ts';

interface CloudSyncProps {
    customers: CustomerInfo[];
    jobs: EstimateRecord[];
}

const CloudSync: React.FC<CloudSyncProps> = ({ customers, jobs }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const mcpClient = useRef<Client | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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

    const getClient = async (): Promise<Client> => {
        if (mcpClient.current) {
            // In a real-world scenario, you might check a connection status property
            // but for this SDK version, we re-use the instance if it exists.
            return mcpClient.current;
        }
        
        // FIX: Route requests through a CORS proxy to prevent "Failed to fetch" errors caused by browser security policies.
        const PROXY_URL = "https://corsproxy.io/?";
        const serverUrl = "https://mcp.zapier.com/api/mcp/s/NmJmMGM1ODMtY2U3NS00NmU5LWE3NTEtYTc1MjA5OTZjNGZmOmQ0NzQyYTcxLWEzYzEtNDlmMy1hZTZjLWE5NjZmZjYwNTQxZQ==/mcp";
        const client = new Client(
            { name: "foam-crm-ai-client", version: "1.0.0" },
            { capabilities: {} }
        );
        const transport = new StreamableHTTPClientTransport(new URL(PROXY_URL + serverUrl));
        
        await client.connect(transport);
        mcpClient.current = client;
        return client;
    };

    const handleBackupToDrive = async () => {
        setIsLoading(true);
        showStatus('Connecting to server...', 0);

        try {
            const client = await getClient();
            const timestamp = new Date().toISOString().split('T')[0];

            // 1. Backup Customers
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

            // 2. Backup Jobs (excluding Blob data)
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
            setIsLoading(false);
        }
    };

    return (
        <div ref={menuRef} className="fixed bottom-24 right-[5.5rem] z-[9998] flex flex-col items-end">
            {status && !isOpen && (
                 <div className="bg-slate-900/80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg mb-2 text-center animate-fade-in">
                    {status}
                </div>
            )}

            {isOpen && (
                <div className="flex flex-col items-end gap-3 mb-3 animate-fade-in-up">
                    <div className="flex items-center gap-3">
                         <span className="bg-slate-900/70 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg">{isLoading ? status : 'Backup to Drive'}</span>
                        <button
                            onClick={handleBackupToDrive}
                            disabled={isLoading}
                            className="w-12 h-12 bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-full shadow-md flex items-center justify-center transition-transform transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Backup Data to Google Drive"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-6 w-6 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2m2-12v10a2 2 0 002 2h4a2 2 0 002-2V4m-6 0h6m-6 6h6" /></svg>
                            )}
                        </button>
                    </div>
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