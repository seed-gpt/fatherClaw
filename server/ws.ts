import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { attachStream, getSession } from './docker.js';

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

    const session = getSession(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ error: 'Session not found' }));
      ws.close();
      return;
    }

    console.log(`[ws] Client connected to session ${sessionId}`);
    ws.send(`\x1b[36m⚡ Connected to FatherClaude agent [${sessionId.slice(0, 8)}]\x1b[0m\r\n`);
    ws.send(`\x1b[90m── Prompt: "${session.prompt.slice(0, 80)}${session.prompt.length > 80 ? '...' : ''}" ──\x1b[0m\r\n\r\n`);

    try {
      const stream = await attachStream(sessionId);
      if (!stream) {
        ws.send('\x1b[31m✗ Failed to attach to container stream\x1b[0m\r\n');
        ws.close();
        return;
      }

      // Relay container output → WebSocket → xterm.js
      stream.on('data', (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(chunk);
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

      // Handle client disconnect
      ws.on('close', () => {
        console.log(`[ws] Client disconnected from session ${sessionId}`);
        (stream as NodeJS.ReadableStream & { destroy(): void }).destroy();
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      ws.send(`\x1b[31m✗ Attach error: ${msg}\x1b[0m\r\n`);
      ws.close();
    }
  });

  console.log('[ws] WebSocket server ready on /ws');
  return wss;
}
