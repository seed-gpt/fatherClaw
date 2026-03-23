import Dockerode from 'dockerode';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { sessionManager } from './session.js';

// Auto-detect Docker socket for macOS, Linux, and Windows
let socketPath = '/var/run/docker.sock';
const macSocket = path.join(os.homedir(), '.docker/run/docker.sock');
if (!fs.existsSync(socketPath) && fs.existsSync(macSocket)) {
  socketPath = macSocket;
}

const docker = process.env.DOCKER_HOST ? new Dockerode() : new Dockerode({ socketPath });

export async function buildDynamicImage(sessionId: string, contextDir: string, onLog: (msg: string) => void): Promise<string> {
  const imageName = `fatherclaw-agent-${sessionId}`;
  onLog(`\x1b[36m⚡ Building child agent container [${imageName}]...\x1b[0m\r\n`);
  
  // Make sure Dockerfile exists
  if (!fs.existsSync(path.join(contextDir, 'Dockerfile'))) {
    throw new Error('Father Claw did not produce a Dockerfile in the workspace.');
  }

  const stream = await docker.buildImage(
    { context: contextDir, src: fs.readdirSync(contextDir) },
    { t: imageName }
  );

  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err) => (err ? reject(err) : resolve()),
      (progress) => {
        if (progress.stream) {
          onLog(`\x1b[90m${progress.stream.trim()}\x1b[0m\r\n`);
        }
      }
    );
  });
  
  onLog(`\x1b[32m✓ Child agent container built successfully.\x1b[0m\r\n`);
  return imageName;
}

export async function spawnInteractiveAgent(sessionId: string, imageName: string): Promise<string> {
  const container = await docker.createContainer({
    Image: imageName,
    name: `fc-${sessionId}`,
    Env: [
      `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}`,
      `MAX_BUDGET=${process.env.MAX_BUDGET || '5'}`,
    ],
    Tty: true,
    OpenStdin: true,
    StdinOnce: false,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    HostConfig: {
      AutoRemove: true,
      NetworkMode: 'bridge',
      Memory: 512 * 1024 * 1024, // 512MB limit
    },
    Labels: { 'fatherclaw': 'true', 'session': sessionId },
  });

  sessionManager.updateStatus(sessionId, 'running', { containerId: container.id });
  await container.start();

  // Auto-cleanup when container exits
  container.wait().then(() => {
    sessionManager.updateStatus(sessionId, 'done');
  }).catch(() => {
    sessionManager.updateStatus(sessionId, 'error');
  });

  return container.id;
}

export async function attachInteractiveStream(sessionId: string) {
  const session = sessionManager.getSession(sessionId);
  if (!session || !session.containerId) return null;

  const container = docker.getContainer(session.containerId);
  const stream = await container.attach({
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true,
    logs: true,
    hijack: true
  });
  
  // Notice we return the duplex stream so we can `.write()` to it
  return stream;
}

export async function stopAgent(sessionId: string): Promise<boolean> {
  const session = sessionManager.getSession(sessionId);
  if (!session || !session.containerId) return false;

  try {
    const container = docker.getContainer(session.containerId);
    await container.stop({ t: 2 });
  } catch {
    // Container may already be stopped/removed (AutoRemove)
  }
  sessionManager.updateStatus(sessionId, 'done');
  return true;
}

export { docker };
