import Dockerode from 'dockerode';
import { PassThrough } from 'stream';
import path from 'path';

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });
const IMAGE_NAME = 'fatherclaude-agent';
const DOCKER_DIR = path.resolve(import.meta.dirname, '..', 'docker');

interface Session {
  id: string;
  containerId: string;
  prompt: string;
  status: 'starting' | 'running' | 'done' | 'error';
  createdAt: Date;
  stream?: PassThrough;
}

const sessions = new Map<string, Session>();

// ── Build the agent Docker image ──
export async function buildImage(): Promise<void> {
  const exists = await docker.listImages({ filters: { reference: [IMAGE_NAME] } });
  if (exists.length > 0) return;

  console.log(`[docker] Building ${IMAGE_NAME}...`);
  const stream = await docker.buildImage(
    { context: DOCKER_DIR, src: ['Dockerfile.claude', 'workspace/CLAUDE.md', 'workspace/mcp_servers.json'] },
    { t: IMAGE_NAME }
  );
  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(stream, (err: Error | null) => (err ? reject(err) : resolve()));
  });
  console.log(`[docker] Image ${IMAGE_NAME} built.`);
}

// ── Spawn a new agent container ──
export async function spawnAgent(prompt: string, sessionId: string): Promise<Session> {
  const container = await docker.createContainer({
    Image: IMAGE_NAME,
    name: `fc-${sessionId}`,
    Env: [
      `AGENT_PROMPT=${prompt}`,
      `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}`,
      `MAX_BUDGET=${process.env.MAX_BUDGET || '5'}`,
    ],
    Tty: true,
    AttachStdout: true,
    AttachStderr: true,
    HostConfig: {
      AutoRemove: true,
      NetworkMode: 'bridge',
      Memory: 512 * 1024 * 1024, // 512MB limit
    },
    Labels: { 'fatherclaude': 'true', 'session': sessionId },
  });

  const session: Session = {
    id: sessionId,
    containerId: container.id,
    prompt,
    status: 'starting',
    createdAt: new Date(),
  };
  sessions.set(sessionId, session);

  await container.start();
  session.status = 'running';

  // Auto-cleanup when container exits
  container.wait().then(() => {
    session.status = 'done';
  }).catch(() => {
    session.status = 'error';
  });

  return session;
}

// ── Attach to container TTY stream ──
export async function attachStream(sessionId: string): Promise<NodeJS.ReadableStream | null> {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const container = docker.getContainer(session.containerId);
  const stream = await container.attach({ stream: true, stdout: true, stderr: true, logs: true });
  return stream;
}

// ── Stop & remove agent container ──
export async function stopAgent(sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) return false;

  try {
    const container = docker.getContainer(session.containerId);
    await container.stop({ t: 2 });
  } catch {
    // Container may already be stopped/removed (AutoRemove)
  }
  session.status = 'done';
  return true;
}

// ── List all sessions ──
export function listSessions(): Session[] {
  return Array.from(sessions.values()).map(({ stream, ...rest }) => rest as Session);
}

// ── Get single session ──
export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export { docker, IMAGE_NAME };
