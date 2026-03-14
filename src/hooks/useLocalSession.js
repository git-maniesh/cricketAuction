import { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'elite_auction_session';

/**
 * Persists user session info in localStorage so users can rejoin their
 * room on a page refresh without re-entering credentials.
 *
 * Returns: { session, saveSession, clearSession }
 */
export function useLocalSession() {
    const [session, setSessionState] = useState(() => {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    const saveSession = useCallback((data) => {
        const s = { ...data, savedAt: Date.now() };
        localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        setSessionState(s);
    }, []);

    const clearSession = useCallback(() => {
        localStorage.removeItem(SESSION_KEY);
        setSessionState(null);
    }, []);

    // Auto-expire sessions older than 24 hours
    useEffect(() => {
        if (session && Date.now() - (session.savedAt || 0) > 24 * 60 * 60 * 1000) {
            clearSession();
        }
    }, [session, clearSession]);

    return { session, saveSession, clearSession };
}
