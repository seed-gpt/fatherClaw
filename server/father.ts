import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const SESSIONS_DIR = path.resolve(import.meta.dirname, '..', 'sessions');

export async function generateWorkspace(sessionId: string, prompt: string, onLog: (msg: string) => void): Promise<string> {
  const dir = path.join(SESSIONS_DIR, sessionId);
  await fs.mkdir(dir, { recursive: true });

  onLog(`\x1b[36m⚡ Father Claude is generating a custom workspace for you...\x1b[0m\r\n`);
  
  const instructions = `
You are FatherClaude building an isolated workspace for a user request.
USER REQUEST: "${prompt}"

1. Create a "Dockerfile" in the current directory.
2. It MUST use "FROM node:20-slim".
3. It MUST install system dependencies (curl, git, jq, etc) as needed by the prompt.
4. It MUST run "npm install -g @anthropic-ai/claude-code".
5. Optionally create an "mcp_servers.json", skills scripts, or initial files if the prompt requires them.
6. Make sure to COPY those files into the container.
7. The ENTRYPOINT MUST be '["claude"]'.
8. Please immediately write these files to the current directory.
  `.trim();

  return new Promise((resolve, reject) => {
    let fullOutput = '';
    
    // Use spawn to stream output live to the WebSocket and avoid maxBuffer issues
    const child = spawn('claude', ['-p', instructions, '--permission-mode', 'bypassPermissions'], {
      cwd: dir,
      env: { ...process.env },
      shell: true // required for resolving 'claude' via global path on some platforms
    });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      fullOutput += text;
      // Convert newlines to CRLF for xterm.js rendering
      onLog(text.replace(/\r?\n/g, '\r\n'));
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      fullOutput += text;
      // Fade stderr with gray
      onLog(`\x1b[90m${text.replace(/\r?\n/g, '\r\n')}\x1b[0m`);
    });

    child.on('close', async (code) => {
      if (code === 0) {
        onLog(`\r\n\x1b[32m✓ Workspace generated successfully.\x1b[0m\r\n`);
        await fs.writeFile(path.join(dir, 'father.log'), fullOutput);
        resolve(dir);
      } else {
        const errorMsg = `Father Claude exited with code ${code}`;
        onLog(`\r\n\x1b[31m✗ ${errorMsg}\x1b[0m\r\n`);
        reject(new Error(errorMsg));
      }
    });

    child.on('error', (err) => {
      onLog(`\r\n\x1b[31m✗ Spawn error: ${err.message}\x1b[0m\r\n`);
      reject(err);
    });
  });
}
