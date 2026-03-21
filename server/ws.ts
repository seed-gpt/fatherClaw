import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { attachInteractiveStream } from './docker.js';
import { sessionManager } from './session.js';

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws: WebSocket, req) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('session');

    if (!sessionId) {
      ws.send(JSON.stringify({ error: 'Missing session param' }));
      ws.close();
      return;
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ error: 'Session not found' }));
      ws.close();
      return;
    }

    console.log(`[ws] Client connected to session ${sessionId}`);
    ws.send(`\x1b[36m⚡ FatherClaude orchestrating phase for [${sessionId.slice(0, 8)}]\x1b[0m\r\n`);
    ws.send(`\x1b[90m── Prompt: "${session.prompt.slice(0, 80)}${session.prompt.length > 80 ? '...' : ''}" ──\x1b[0m\r\n\r\n`);

    // 1. Relay log messages during Background Generation/Build
    const logHandler = (msg: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    };
    sessionManager.on(`log:${sessionId}`, logHandler);

    // 2. State transition listener to trigger Docker Attach
    let attached = false;
    const attachToDocker = async () => {
      if (attached) return;
      attached = true;
      try {
        const stream = await attachInteractiveStream(sessionId);
        if (!stream) {
          ws.send('\r\n\x1b[31m✗ Failed to attach to container stream\x1b[0m\r\n');
          return;
        }

        // Output logic
        stream.on('data', (chunk: Buffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(chunk.toString('utf8'));
          }
        });

        // Input logic
        ws.on('message', (data) => {
          if (stream.writable) {
            stream.write(data.toString());
          }
        });

        stream.on('end', () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('\r\n\x1b[32m✓ Agent finished.\x1b[0m\r\n');
            ws.close();
          }
        });

        stream.on('error', (err: Error) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(`\r\n\x1b[31m✗ Stream error: ${err.message}\x1b[0m\r\n`);
            ws.close();
          }
        });

        // Cleanup stream when WS closes
        ws.on('close', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (stream as any).destroy?.();
        });

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\r\n\x1b[31m✗ Attach error: ${msg}\x1b[0m\r\n`);
          ws.close();
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateHandler = (updatedSession: any) => {
      if (updatedSession.id === sessionId && updatedSession.status === 'running') {
        attachToDocker();
      }
    };
    sessionManager.on('update', updateHandler);

    // If already running
    if (session.status === 'running') {
      attachToDocker();
    }

    // Handle client disconnect
    ws.on('close', () => {
      console.log(`[ws] Client disconnected from session ${sessionId}`);
      sessionManager.off(`log:${sessionId}`, logHandler);
      sessionManager.off('update', updateHandler);
    });
  });

  console.log('[ws] WebSocket server ready on /ws');
  return wss;
}
