import { useRef } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import '@xterm/xterm/css/xterm.css';

interface Props {
  sessionId: string | null;
}

export function TerminalPanel({ sessionId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTerminal(sessionId, containerRef);

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <span className="terminal-title">
          {sessionId ? `agent:${sessionId.slice(0, 8)}` : 'terminal'}
        </span>
      </div>
      <div className="terminal-body" ref={containerRef}>
        {!sessionId && (
          <div className="terminal-empty">
            <div className="terminal-empty-icon">🤖</div>
            <p>Spawn an agent to see it work</p>
            <p className="terminal-empty-sub">The terminal will stream OpenClaw's live output</p>
          </div>
        )}
      </div>
    </div>
  );
}
