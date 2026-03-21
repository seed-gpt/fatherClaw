import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { AttachAddon } from '@xterm/addon-attach';

const WS_BASE = import.meta.env.DEV
  ? `ws://localhost:3001`
  : `ws://${window.location.host}`;

export function useTerminal(sessionId: string | null, containerRef: React.RefObject<HTMLDivElement | null>) {
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!sessionId || !containerRef.current) return;

    // Clean up previous
    wsRef.current?.close();
    termRef.current?.dispose();

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 14,
      lineHeight: 1.4,
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#58a6ff',
        selectionBackground: '#264f78',
        black: '#0d1117',
        red: '#ff7b72',
        green: '#7ee787',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#76e3ea',
        white: '#e6edf3',
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    // WebSocket connection
    const ws = new WebSocket(`${WS_BASE}/ws?session=${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      const attach = new AttachAddon(ws, { bidirectional: false });
      term.loadAddon(attach);
    };

    ws.onclose = () => {
      term.writeln('\r\n\x1b[90m── Connection closed ──\x1b[0m');
    };

    ws.onerror = () => {
      term.writeln('\r\n\x1b[31m✗ WebSocket error\x1b[0m');
    };

    // Auto-fit on resize
    const observer = new ResizeObserver(() => fit.fit());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      ws.close();
      term.dispose();
    };
  }, [sessionId, containerRef]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { terminal: termRef, fit: fitRef };
}
