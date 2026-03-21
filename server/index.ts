import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import apiRouter from './api.js';
import { setupWebSocket } from './ws.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();

app.use(cors());

// API routes
app.use('/api', apiRouter);

// In production, serve Vite build
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(import.meta.dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// HTTP + WebSocket server
const server = createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║                                                  ║
  ║   ⚡ FatherClaude Server                         ║
  ║   ─────────────────────────                      ║
  ║   API:  http://localhost:${PORT}/api              ║
  ║   WS:   ws://localhost:${PORT}/ws                 ║
  ║                                                  ║
  ║   Powered by AgentsBooks.com                     ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
  `);
});
