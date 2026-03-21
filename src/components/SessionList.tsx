import { useEffect } from 'react';
import type { Session } from '../hooks/useSession';

interface Props {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onKill: (id: string) => void;
  onRefresh: () => void;
}

const STATUS_INDICATORS: Record<string, string> = {
  generating: '🟡',
  building: '🟠',
  running: '🟢',
  done: '⚪',
  error: '🔴',
};

export function SessionList({ sessions, activeId, onSelect, onKill, onRefresh }: Props) {
  // Auto-refresh running sessions
  useEffect(() => {
    const hasActive = sessions.some(s => s.status === 'running' || s.status === 'generating' || s.status === 'building');
    if (!hasActive) return;
    const interval = setInterval(onRefresh, 3000);
    return () => clearInterval(interval);
  }, [sessions, onRefresh]);

  if (sessions.length === 0) {
    return (
      <div className="session-list">
        <div className="session-list-header">Sessions</div>
        <div className="session-empty">No active sessions</div>
      </div>
    );
  }

  return (
    <div className="session-list">
      <div className="session-list-header">
        Sessions
        <span className="session-count">{sessions.length}</span>
      </div>
      {sessions.map(s => (
        <div
          key={s.id}
          className={`session-item ${activeId === s.id ? 'active' : ''}`}
          onClick={() => onSelect(s.id)}
        >
          <span className="session-status">{STATUS_INDICATORS[s.status] || '⚪'}</span>
          <div className="session-info">
            <div className="session-id">{s.id.slice(0, 8)}</div>
            <div className="session-prompt">{s.prompt.slice(0, 40)}{s.prompt.length > 40 ? '…' : ''}</div>
          </div>
          {(s.status === 'running' || s.status === 'generating' || s.status === 'building') && (
            <button
              className="session-kill"
              onClick={e => { e.stopPropagation(); onKill(s.id); }}
              title="Stop agent"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
