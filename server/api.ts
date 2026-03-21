import { Router, json } from 'express';
import { randomUUID } from 'crypto';
import { spawnAgent, stopAgent, listSessions, buildImage } from './docker.js';

const router = Router();
router.use(json());

// ── POST /api/spawn — Spawn a new Claude agent ──
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

    // Ensure image is built
    await buildImage();

    const sessionId = randomUUID().slice(0, 12);
    const session = await spawnAgent(prompt.trim(), sessionId);
    res.json({ sessionId: session.id, status: session.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to spawn agent';
    console.error('[api] Spawn error:', msg);
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/sessions — List all sessions ──
router.get('/sessions', (_req, res) => {
  res.json(listSessions());
});

// ── DELETE /api/sessions/:id — Kill a session ──
router.delete('/sessions/:id', async (req, res) => {
  const ok = await stopAgent(req.params.id);
  res.json({ ok });
});

// ── GET /api/health — Health check ──
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
