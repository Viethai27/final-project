import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

type DatabaseTarget = {
  host: string;
  port: number;
};

function parseDatabaseTarget(): DatabaseTarget | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  try {
    const url = new URL(databaseUrl);
    const port = Number(url.port || '3306');

    if (!url.hostname || Number.isNaN(port) || port <= 0) {
      return null;
    }

    return {
      host: url.hostname,
      port,
    };
  } catch {
    return null;
  }
}

function waitForPort(host: string, port: number, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise<void>((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host, port });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();

        if (Date.now() >= deadline) {
          reject(new Error(`Timed out waiting for ${host}:${port}.`));
          return;
        }

        setTimeout(attempt, 1000);
      });
    };

    attempt();
  });
}

function resolveComposeFile() {
  const candidates = [
    path.resolve(process.cwd(), 'docker-compose.yml'),
    path.resolve(process.cwd(), 'backend', 'docker-compose.yml'),
    process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD, 'backend', 'docker-compose.yml') : null,
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find(candidate => existsSync(candidate)) ?? null;
}

function startMysql(composeFile: string) {
  const result = spawnSync('docker', ['compose', '-f', composeFile, 'up', '-d', 'mysql'], {
    stdio: 'inherit',
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      `MySQL is not available and Docker Compose could not start it automatically. ` +
        `Start it manually with: docker compose -f ${composeFile} up -d mysql`,
    );
  }
}

export async function ensureDatabaseAvailable() {
  const target = parseDatabaseTarget();

  if (!target) {
    return;
  }

  try {
    await waitForPort(target.host, target.port, 1000);
    return;
  } catch {
    // Keep going so we can try to start the local MySQL service automatically.
  }

  const composeFile = resolveComposeFile();
  if (!composeFile) {
    throw new Error(
      `MySQL is not available on ${target.host}:${target.port} and no docker-compose file was found. ` +
        `Expected backend/docker-compose.yml.`,
    );
  }

  startMysql(composeFile);
  await waitForPort(target.host, target.port, 120000);
  await new Promise(resolve => setTimeout(resolve, 2000));
}
