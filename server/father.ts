import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const SESSIONS_DIR = path.resolve(import.meta.dirname, '..', 'sessions');

export async function generateWorkspace(sessionId: string, prompt: string, onLog: (msg: string) => void): Promise<string> {
  const dir = path.join(SESSIONS_DIR, sessionId);
  await fs.mkdir(dir, { recursive: true });

  onLog(`\x1b[36m⚡ Father Claude is generating a custom workspace for you...\x1b[0m\r\n`);
  
  // Create a base system prompt for Father Claude
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

  try {
    const { stdout, stderr } = await execAsync(
      `claude -p "${instructions.replace(/"/g, '\\"')}" --permission-mode bypassPermissions`, 
      { 
        cwd: dir, 
        env: { ...process.env }, // inherits API key
        timeout: 120000 // 2 minute timeout
      }
    );
    
    onLog(`\x1b[32m✓ Workspace generated successfully.\x1b[0m\r\n`);
    // Optional: write stdout/stderr to a log file inside the session for debugging
    await fs.writeFile(path.join(dir, 'father.log'), stdout + '\n' + stderr);

    return dir;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    onLog(`\x1b[31m✗ Father Claude execution failed: ${errMsg}\x1b[0m\r\n`);
    throw err;
  }
}
