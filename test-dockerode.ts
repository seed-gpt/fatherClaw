import Dockerode from 'dockerode';
import fs from 'fs';
import os from 'os';
import path from 'path';

let socketPath = '/var/run/docker.sock';
const macSocket = path.join(os.homedir(), '.docker/run/docker.sock');
if (!fs.existsSync(socketPath) && fs.existsSync(macSocket)) {
  socketPath = macSocket;
}

const docker = process.env.DOCKER_HOST ? new Dockerode() : new Dockerode({ socketPath });

async function runTest() {
  console.log("Creating container...");
  const container = await docker.createContainer({
    Image: 'fatherclaw-agent',
    Env: [
      `AGENT_PROMPT=Say the exact words "test success 123" and nothing else`,
      `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}`,
    ],
    Tty: true,
    AttachStdout: true,
    AttachStderr: true,
    HostConfig: {
      AutoRemove: true,
    }
  });

  console.log("Attaching to stream...");
  const stream = await container.attach({
    stream: true,
    stdout: true,
    stderr: true
  });

  stream.setEncoding('utf8');
  stream.on('data', (d) => process.stdout.write(d));

  console.log("Starting container...");
  await container.start();

  console.log("Waiting for container to finish...");
  await container.wait();
  console.log("Done!");
}

runTest().catch(console.error);
