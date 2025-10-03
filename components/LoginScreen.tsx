import React from 'react';
import { CurrentUser } from '../App.tsx';
import Logo from './Logo.tsx';

interface LoginScreenProps {
    onLogin: (user: CurrentUser) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {

    // For this demo, the first employee from the DB will be used.
    // In a real app, this would be a PIN entry screen.
    const handleEmployeeLogin = () => {
         onLogin({ role: 'employee', data: { id: 1, name: 'John Doe', role: 'Installer', pin: '1234' } });
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center p-4">
            <Logo />
            <div className="w-full max-w-sm mx-auto text-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm p-8">
                <h1 className="text-2xl font-bold dark:text-white">Welcome</h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Select a role to enter the application.
                </p>
                <div className="mt-6 flex flex-col gap-4">
                    <button
                        onClick={() => onLogin({ role: 'admin' })}
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-semibold shadow hover:bg-blue-700 transition-colors"
                    >
                        Enter as Admin
                    </button>
                    <button
                       onClick={handleEmployeeLogin}
                       className="w-full rounded-lg bg-slate-500 px-4 py-3 text-white font-semibold shadow hover:bg-slate-600 transition-colors"
                    >
                       Enter as Employee (Demo)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;