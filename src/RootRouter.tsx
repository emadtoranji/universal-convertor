import React, { useState, useEffect } from 'react';
import App from './App';
import DatePage from './pages/DatePage';

function normalizePath(pathname: string): string {
    const trimmed = pathname.trim();
    if (trimmed.length > 1 && trimmed.endsWith('/')) {
        return trimmed.slice(0, -1);
    }
    return trimmed;
}

export function RootRouter(): React.ReactElement {
    const [currentPath, setCurrentPath] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return normalizePath(window.location.pathname);
        }
        return '/';
    });

    useEffect(() => {
        const handlePopState = (): void => {
            setCurrentPath(normalizePath(window.location.pathname));
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    if (currentPath === '/date') {
        return <DatePage />;
    }

    return <App />;
}

export default RootRouter;

