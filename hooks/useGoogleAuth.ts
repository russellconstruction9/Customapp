import { useState, useEffect, useCallback } from 'react';

// Declare google for TypeScript
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const API_KEY = 'AIzaSyCgcu2OEs4a61Dw6MUGxv93609eNDVM3uI'; // From index.html
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

export const useGoogleAuth = () => {
    const [tokenClient, setTokenClient] = useState<any>(null);
    // FIX: Replaced `google.accounts.oauth2.TokenResponse` with `any` to resolve "Cannot find namespace 'google'" error, as the type definitions are not available in the context.
    const [token, setToken] = useState<any | null>(null);
    const [isGapiLoaded, setIsGapiLoaded] = useState(false);
    const [isGsiLoaded, setIsGsiLoaded] = useState(false);
    const [clientId, setClientId] = useState<string | null>(null);

    // Get Client ID from meta tag
    useEffect(() => {
        const meta = document.querySelector('meta[name="google-client-id"]');
        const id = meta ? meta.getAttribute('content') : null;
        if (id && id !== 'YOUR_CLIENT_ID.apps.googleusercontent.com') {
            setClientId(id);
        }
    }, []);

    // Load GAPI (for Picker)
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            window.gapi.load('client:picker', () => {
                window.gapi.client.load(DISCOVERY_DOC).then(() => {
                    setIsGapiLoaded(true);
                });
            });
        };
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Load GSI (for Auth) and initialize client
    useEffect(() => {
        if (!clientId) return;
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            setIsGsiLoaded(true);
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                // FIX: Replaced `google.accounts.oauth2.TokenResponse` with `any` for the callback parameter type to resolve the namespace error.
                callback: (tokenResponse: any) => {
                    setToken(tokenResponse);
                },
            });
            setTokenClient(client);
        };
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, [clientId]);
    
    const signIn = useCallback(() => {
        if (tokenClient) {
            tokenClient.requestAccessToken();
        }
    }, [tokenClient]);

    const signOut = useCallback(() => {
        if (token) {
            window.google.accounts.oauth2.revoke(token.access_token, () => {
                setToken(null);
            });
        }
    }, [token]);

    const isReady = isGapiLoaded && isGsiLoaded && !!tokenClient;
    const isConfigured = !!clientId;

    return { token, signIn, signOut, isReady, isConfigured, apiKey: API_KEY };
};