import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db.ts';
import { DriveFile } from './types.ts';
import { useGoogleAuth } from '../hooks/useGoogleAuth.ts';

interface GoogleDriveManagerProps {
    customerId: number;
}

const GoogleDriveManager: React.FC<GoogleDriveManagerProps> = ({ customerId }) => {
    const [linkedFiles, setLinkedFiles] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { token, signIn, signOut, isReady, isConfigured, apiKey } = useGoogleAuth();
    
    const loadLinkedFiles = useCallback(async () => {
        setIsLoading(true);
        try {
            const files = await db.drive_files.where('customerId').equals(customerId).toArray();
            setLinkedFiles(files);
        } catch (error) {
            console.error("Error loading linked files from DB:", error);
        } finally {
            setIsLoading(false);
        }
    }, [customerId]);
    
    useEffect(() => {
        loadLinkedFiles();
    }, [loadLinkedFiles]);
    
    const handlePickerCallback = useCallback(async (data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const newFiles: Omit<DriveFile, 'id'>[] = data.docs.map((doc: any) => ({
                customerId,
                fileId: doc.id,
                fileName: doc.name,
                webLink: doc.url,
                iconLink: doc.iconUrl,
            }));
            
            try {
                await db.drive_files.bulkAdd(newFiles as DriveFile[]);
                loadLinkedFiles(); // Refresh the list
            } catch (error) {
                console.error("Error saving linked files to DB:", error);
            }
        }
    }, [customerId, loadLinkedFiles]);
    
    const showPicker = useCallback(() => {
        if (!isReady || !token) return;

        const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
        view.setMimeTypes("image/png,image/jpeg,image/jpg,application/pdf,application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet");
        const picker = new window.google.picker.PickerBuilder()
            .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
            .setAppId(apiKey) // This should be the Project Number, but API key is often used for simplicity
            .setOAuthToken(token.access_token)
            .addView(view)
            .addView(new window.google.picker.DocsUploadView())
            .setCallback(handlePickerCallback)
            .build();
        picker.setVisible(true);
    }, [isReady, token, apiKey, handlePickerCallback]);
    
    const handleUnlinkFile = async (fileId: number) => {
        if (window.confirm("Are you sure you want to unlink this file? This will not delete it from Google Drive.")) {
            try {
                await db.drive_files.delete(fileId);
                loadLinkedFiles(); // Refresh
            } catch (error) {
                console.error("Error unlinking file:", error);
            }
        }
    };

    if (!isConfigured) {
        return (
            <div className="p-4 text-center bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg">
                <h3 className="font-semibold">Google Drive Not Configured</h3>
                <p className="text-sm mt-1">Please add your Google Client ID to the `index.html` file to enable this feature.</p>
            </div>
        );
    }
    
    if (!token) {
        return (
            <div className="text-center py-8">
                <button 
                    onClick={signIn}
                    disabled={!isReady}
                    className="flex items-center gap-3 mx-auto bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold px-6 py-3 rounded-lg shadow-md border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                    <svg className="w-6 h-6" viewBox="0 0 48 48"><g><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></g></svg>
                    Connect Google Drive
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Allows you to link files to this customer.</p>
            </div>
        );
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                 <button 
                    onClick={showPicker}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-semibold shadow hover:bg-blue-700"
                >
                    + Add File from Drive
                </button>
                 <button onClick={signOut} className="text-xs text-slate-500 hover:underline">
                    Disconnect
                </button>
            </div>
            
            {isLoading ? <p className="text-sm text-slate-500">Loading files...</p> : (
                <div className="space-y-2">
                    {linkedFiles.length === 0 ? <p className="text-sm text-center py-4 text-slate-500">No files linked to this customer yet.</p> :
                    linkedFiles.map(file => (
                        <div key={file.id} className="p-2 rounded-lg border bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 flex items-center justify-between gap-2">
                            <a href={file.webLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group flex-grow truncate">
                                <img src={file.iconLink} alt="" className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate" title={file.fileName}>{file.fileName}</span>
                            </a>
                            <button onClick={() => handleUnlinkFile(file.id!)} className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 flex-shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GoogleDriveManager;
