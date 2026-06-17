import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';

const npmCommand = 'npm';
const mysqlHost = '127.0.0.1';
const mysqlPort = 3307;
const mysqlComposeFile = 'backend/docker-compose.yml';

function waitForPort(host, port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function run(command, args, label) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed.`);
  }
}

async function ensureMysql() {
  try {
    await waitForPort(mysqlHost, mysqlPort, 1000);
    return;
  } catch {
    // Start the backend MySQL service if it is not already available.
  }

  const result = spawnSync('docker', ['compose', '-f', mysqlComposeFile, 'up', '-d', 'mysql'], {
    stdio: 'inherit',
    shell: true,
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      `MySQL is not available on ${mysqlHost}:${mysqlPort} and Docker Compose could not start it automatically. ` +
        `Start it manually with: docker compose -f ${mysqlComposeFile} up -d mysql`,
    );
  }

  await waitForPort(mysqlHost, mysqlPort, 120000);
  await sleep(2000);
}

function start(command, label) {
  const child = spawn(command, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  child.on('error', error => {
    if (!shuttingDown) {
      console.error(`[${label}] failed to start: ${error.message}`);
      shutdown(`${label.toUpperCase()}_START_FAILED`);
    }
  });

  child.on('exit', code => {
    if (!shuttingDown && code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      shutdown(`${label.toUpperCase()}_EXIT_${code}`);
    }
  });

  return child;
}

let shuttingDown = false;

let backend;
let frontend;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`\nStopping dev servers (${signal})...`);
  backend?.kill();
  frontend?.kill();

  if (process.platform === 'win32') {
    for (const child of [backend, frontend]) {
      if (child?.pid) {
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', shell: true }).unref();
      }
    }
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function main() {
  await ensureMysql();
  run(npmCommand, ['--prefix', 'backend', 'run', 'prisma:migrate:deploy'], 'Prisma migrate deploy');

  backend = start(`${npmCommand} --prefix backend run dev`, 'backend');
  frontend = start(`${npmCommand} run dev:frontend`, 'frontend');
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
