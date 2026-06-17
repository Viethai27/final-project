"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDatabaseAvailable = ensureDatabaseAvailable;
const node_fs_1 = require("node:fs");
const node_child_process_1 = require("node:child_process");
const node_net_1 = __importDefault(require("node:net"));
const node_path_1 = __importDefault(require("node:path"));
function parseDatabaseTarget() {
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
    }
    catch {
        return null;
    }
}
function waitForPort(host, port, timeoutMs = 60000) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const socket = node_net_1.default.createConnection({ host, port });
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
        node_path_1.default.resolve(process.cwd(), 'docker-compose.yml'),
        node_path_1.default.resolve(process.cwd(), 'backend', 'docker-compose.yml'),
        process.env.INIT_CWD ? node_path_1.default.resolve(process.env.INIT_CWD, 'backend', 'docker-compose.yml') : null,
    ].filter((candidate) => Boolean(candidate));
    return candidates.find(candidate => (0, node_fs_1.existsSync)(candidate)) ?? null;
}
function startMysql(composeFile) {
    const result = (0, node_child_process_1.spawnSync)('docker', ['compose', '-f', composeFile, 'up', '-d', 'mysql'], {
        stdio: 'inherit',
    });
    if (result.error || result.status !== 0) {
        throw new Error(`MySQL is not available and Docker Compose could not start it automatically. ` +
            `Start it manually with: docker compose -f ${composeFile} up -d mysql`);
    }
}
async function ensureDatabaseAvailable() {
    const target = parseDatabaseTarget();
    if (!target) {
        return;
    }
    try {
        await waitForPort(target.host, target.port, 1000);
        return;
    }
    catch {
        // Keep going so we can try to start the local MySQL service automatically.
    }
    const composeFile = resolveComposeFile();
    if (!composeFile) {
        throw new Error(`MySQL is not available on ${target.host}:${target.port} and no docker-compose file was found. ` +
            `Expected backend/docker-compose.yml.`);
    }
    startMysql(composeFile);
    await waitForPort(target.host, target.port, 120000);
    await new Promise(resolve => setTimeout(resolve, 2000));
}
