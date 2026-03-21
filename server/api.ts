import { Router, json } from 'express';
import { randomUUID } from 'crypto';
import { sessionManager } from './session.js';
import { generateWorkspace } from './father.js';
import { buildDynamicImage, spawnInteractiveAgent, stopAgent } from './docker.js';

const router = Router();
router.use(json());

// ── POST /api/spawn — Spawn a new dynamic child agent ──
router.post('/spawn', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server' });
      return;
    }

    const sessionId = randomUUID().slice(0, 12);
    sessionManager.createSession(sessionId, prompt.trim());
    
    // Asynchronous pipeline: Father -> Build -> Child
    (async () => {
      try {
        const onLog = (msg: string) => sessionManager.log(sessionId, msg);
        
        sessionManager.updateStatus(sessionId, 'generating');
        const contextDir = await generateWorkspace(sessionId, prompt, onLog);
        
        sessionManager.updateStatus(sessionId, 'building');
        const imageName = await buildDynamicImage(sessionId, contextDir, onLog);
        
        // spawnInteractiveAgent changes status to 'running'
        await spawnInteractiveAgent(sessionId, imageName);
        sessionManager.log(sessionId, `\x1b[35m[System] Child Agent Container Attached.\x1b[0m\r\n`);

      } catch (err) {
        console.error(`[pipeline] Error for session ${sessionId}:`, err);
        sessionManager.updateStatus(sessionId, 'error');
        const msg = err instanceof Error ? err.message : String(err);
        sessionManager.log(sessionId, `\r\n\x1b[31m✗ Pipeline Error: ${msg}\x1b[0m\r\n`);
      }
    })();

    // Respond immediately so frontend can connect WebSocket
    res.json({ sessionId, status: 'generating' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to initialize pipeline';
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/sessions — List all sessions ──
router.get('/sessions', (_req, res) => {
  res.json(sessionManager.listSessions());
});

// ── DELETE /api/sessions/:id — Kill a session ──
router.delete('/sessions/:id', async (req, res) => {
  const ok = await stopAgent(req.params.id);
  sessionManager.deleteSession(req.params.id);
  res.json({ ok });
});

// ── GET /api/health — Health check ──
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
