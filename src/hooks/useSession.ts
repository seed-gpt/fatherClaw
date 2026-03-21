import { useState, useCallback } from 'react';

const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
const API_BASE = (import.meta.env.DEV || isGitHubPages) ? 'http://localhost:3001' : '';

export interface Session {
  id: string;
  prompt: string;
  status: 'starting' | 'running' | 'done' | 'error';
  createdAt: string;
}

export function useSession() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions`);
      const data = await res.json();
      setSessions(data);
    } catch { /* silent */ }
  }, []);

  const spawn = useCallback(async (prompt: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to spawn');
      setActiveId(data.sessionId);
      await refresh();
      return data.sessionId as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refresh]);



  const kill = useCallback(async (id: string) => {
    await fetch(`${API_BASE}/api/sessions/${id}`, { method: 'DELETE' });
    if (activeId === id) setActiveId(null);
    await refresh();
  }, [activeId, refresh]);

  return { sessions, activeId, setActiveId, loading, error, spawn, refresh, kill };
}
