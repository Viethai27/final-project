"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIMULATION_CONFIG = void 0;
exports.scoreRoomForSuggestion = scoreRoomForSuggestion;
exports.rankRoomSuggestions = rankRoomSuggestions;
exports.chooseRoom = chooseRoom;
exports.buildSimulationRooms = buildSimulationRooms;
exports.simulateScenario = simulateScenario;
exports.generatePatients = generatePatients;
exports.runSingleSimulation = runSingleSimulation;
exports.runSimulation = runSimulation;
exports.formatSimulationReport = formatSimulationReport;
exports.writeSimulationResult = writeSimulationResult;
exports.main = main;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
exports.SIMULATION_CONFIG = {
    totalMinutes: 240,
    numRooms: 3,
    roomCapacity: 12,
    avgServiceTime: 8,
    arrivalRates: {
        peak: { from: 0, to: 60, rate: 0.8 },
        normal: { from: 60, to: 150, rate: 0.5 },
        offpeak: { from: 150, to: 240, rate: 0.3 },
    },
    priorityRatio: 0.15,
    numRuns: 100,
};
const roomNames = ['Phong A', 'Phong B', 'Phong C', 'Phong D', 'Phong E'];
const alertPenalty = {
    NORMAL: 0,
    WARNING: 8,
    OVERLOAD: 18,
};
const createRng = (seed) => {
    let value = seed >>> 0;
    return () => {
        value = (1664525 * value + 1013904223) % 4294967296;
        return value / 4294967296;
    };
};
const getRateForMinute = (minute, config) => {
    if (minute >= config.arrivalRates.peak.from && minute < config.arrivalRates.peak.to) {
        return config.arrivalRates.peak.rate;
    }
    if (minute >= config.arrivalRates.normal.from && minute < config.arrivalRates.normal.to) {
        return config.arrivalRates.normal.rate;
    }
    return config.arrivalRates.offpeak.rate;
};
const fallbackRooms = (rooms) => {
    const activeRooms = rooms.filter(room => room.active !== false);
    const primary = activeRooms.filter(room => room.utilizationRate < 1.0);
    if (primary.length > 0) {
        return primary;
    }
    const levelOneFallback = activeRooms.filter(room => room.utilizationRate < 1.2);
    return levelOneFallback;
};
const createRuntimeRooms = (rooms) => rooms.map(room => ({
    ...room,
    availableAt: 0,
    waitingQueue: [],
    serviceMinutesInWindow: 0,
}));
const releaseCompletedPatients = (rooms, currentMinute, totals) => {
    for (const room of rooms) {
        while (room.waitingQueue.length > 0 && room.waitingQueue[0].finishMinute <= currentMinute) {
            const completed = room.waitingQueue.shift();
            if (!completed) {
                break;
            }
            totals.completedPatients += 1;
            totals.waits.push(completed.waitMinutes);
            if (completed.isPriority) {
                totals.priorityWaits.push(completed.waitMinutes);
            }
            else {
                totals.normalWaits.push(completed.waitMinutes);
            }
        }
    }
};
const finalizeUnfinishedPatients = (rooms) => rooms.reduce((sum, room) => sum + room.waitingQueue.length, 0);
const snapshotRuntimeRooms = (rooms, config) => rooms.map(room => ({
    id: room.id,
    name: room.name,
    roomType: room.roomType,
    queueLength: room.waitingQueue.length,
    utilizationRate: Math.min(1.5, room.waitingQueue.length / config.roomCapacity),
    alertLevel: room.waitingQueue.length / config.roomCapacity >= 1.2
        ? 'OVERLOAD'
        : room.waitingQueue.length / config.roomCapacity >= 0.85
            ? 'WARNING'
            : 'NORMAL',
    avgServiceTime: room.avgServiceTime,
    active: room.active,
    currentLoad: room.waitingQueue.length,
}));
const chooseRandomRoom = (rooms, rng) => {
    if (rooms.length === 0) {
        return null;
    }
    const index = Math.floor(rng() * rooms.length);
    return rooms[Math.min(index, rooms.length - 1)] ?? null;
};
function scoreRoomForSuggestion(room, context = {}) {
    const queuePenalty = room.queueLength * 6;
    const utilizationPenalty = room.utilizationRate * 40;
    const currentRoomBonus = context.currentRoomId && context.currentRoomId === room.id ? 12 : 0;
    const priorityBonus = context.isPriority ? 6 : 0;
    const sameDoctorBonus = context.sameDoctorRequired && context.currentRoomId === room.id ? 10 : 0;
    const score = 100 - queuePenalty - utilizationPenalty - alertPenalty[room.alertLevel] + currentRoomBonus + priorityBonus + sameDoctorBonus;
    return Math.max(0, Math.round(score));
}
function rankRoomSuggestions(rooms, context = {}) {
    const candidates = fallbackRooms(rooms);
    if (candidates.length === 0) {
        return [];
    }
    return candidates
        .map(room => {
        const resourceScore = scoreRoomForSuggestion(room, context);
        return {
            room,
            resourceScore,
            queueLength: room.queueLength,
            utilizationRate: room.utilizationRate,
            estimatedWaitMinutes: Math.max(1, Math.round((room.queueLength + 1) * room.avgServiceTime * 0.5)),
            alertLevel: room.alertLevel,
            reason: room.alertLevel === 'NORMAL'
                ? 'tai on dinh'
                : room.alertLevel === 'WARNING'
                    ? 'tai tang'
                    : 'qua tai',
            wasSelected: false,
        };
    })
        .sort((left, right) => right.resourceScore - left.resourceScore)
        .map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
        wasSelected: index === 0,
    }));
}
function chooseRoom(rooms, context = {}) {
    const suggestions = rankRoomSuggestions(rooms, context);
    return suggestions[0] ?? null;
}
function buildSimulationRooms(numRooms, config) {
    return Array.from({ length: numRooms }, (_, index) => ({
        id: `room-${index + 1}`,
        name: roomNames[index] ?? `Phong ${index + 1}`,
        roomType: 'EXAM',
        queueLength: 0,
        utilizationRate: 0,
        alertLevel: 'NORMAL',
        avgServiceTime: config.avgServiceTime,
        active: true,
        currentLoad: 0,
    }));
}
function simulateScenario(patients, rooms, strategy, config, rng = createRng(42)) {
    const stateRooms = createRuntimeRooms(rooms);
    const waits = [];
    const priorityWaits = [];
    const normalWaits = [];
    let admittedPatients = 0;
    let overloadEvents = 0;
    let rejectedOrDeferredPatients = 0;
    const totals = {
        waits,
        priorityWaits,
        normalWaits,
        completedPatients: 0,
    };
    for (const patient of patients) {
        releaseCompletedPatients(stateRooms, patient.arrivalMinute, totals);
        const snapshotRooms = snapshotRuntimeRooms(stateRooms, config);
        const eligibleRooms = snapshotRooms.filter(room => room.queueLength < config.roomCapacity);
        const room = strategy === 'WITH_SUGGESTION'
            ? chooseRoom(eligibleRooms, {
                isPriority: patient.isPriority,
            })?.room ?? null
            : chooseRandomRoom(eligibleRooms, rng);
        if (!room) {
            rejectedOrDeferredPatients += 1;
            continue;
        }
        const runtimeRoom = stateRooms.find(candidate => candidate.id === room.id);
        if (!runtimeRoom) {
            rejectedOrDeferredPatients += 1;
            continue;
        }
        const serviceTime = Math.max(1, Math.round(runtimeRoom.avgServiceTime));
        const startMinute = Math.max(patient.arrivalMinute, runtimeRoom.availableAt);
        const finishMinute = startMinute + serviceTime;
        const wait = Math.max(0, startMinute - patient.arrivalMinute);
        const busyMinutesInWindow = Math.max(0, Math.min(finishMinute, config.totalMinutes) - startMinute);
        if (runtimeRoom.waitingQueue.length >= config.roomCapacity || runtimeRoom.waitingQueue.length / config.roomCapacity >= 1.0 || wait >= config.avgServiceTime * 2) {
            overloadEvents += 1;
        }
        runtimeRoom.waitingQueue.push({
            arrivalMinute: patient.arrivalMinute,
            startMinute,
            finishMinute,
            waitMinutes: wait,
            isPriority: patient.isPriority,
        });
        runtimeRoom.availableAt = finishMinute;
        runtimeRoom.serviceMinutesInWindow += busyMinutesInWindow;
        admittedPatients += 1;
    }
    releaseCompletedPatients(stateRooms, config.totalMinutes, totals);
    const completedPatients = totals.completedPatients;
    const unfinishedPatients = finalizeUnfinishedPatients(stateRooms);
    const avgRoomUtilization = stateRooms.length === 0
        ? 0
        : Number((stateRooms.reduce((sum, room) => sum + room.serviceMinutesInWindow, 0) /
            (stateRooms.length * config.totalMinutes)).toFixed(3));
    const average = (values) => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
    return {
        avgWaitTime: Number(average(waits).toFixed(1)),
        maxWaitTime: waits.length === 0 ? 0 : Number(Math.max(...waits).toFixed(1)),
        priorityAvgWait: Number(average(priorityWaits).toFixed(1)),
        normalAvgWait: Number(average(normalWaits).toFixed(1)),
        overloadEvents,
        throughput: completedPatients,
        admittedPatients,
        completedPatients,
        unfinishedPatients,
        rejectedOrDeferredPatients,
        avgRoomUtilization,
    };
}
function generatePatients(config, seed) {
    const rng = createRng(seed);
    const patients = [];
    for (let minute = 0; minute < config.totalMinutes; minute += 1) {
        const rate = getRateForMinute(minute, config);
        if (rng() < rate) {
            patients.push({
                id: `p-${seed}-${minute}-${patients.length + 1}`,
                arrivalMinute: minute,
                isPriority: rng() < config.priorityRatio,
            });
        }
    }
    return patients;
}
function runSingleSimulation(config, strategy, seed) {
    const rooms = buildSimulationRooms(config.numRooms, config);
    const patients = generatePatients(config, seed);
    return simulateScenario(patients, rooms, strategy, config);
}
function runSimulation(config = exports.SIMULATION_CONFIG) {
    const runs = Math.max(1, config.numRuns);
    const results = Array.from({ length: runs }, (_, index) => {
        const seed = index + 1;
        return {
            withSuggestion: runSingleSimulation(config, 'WITH_SUGGESTION', seed),
            random: runSingleSimulation(config, 'RANDOM', seed),
        };
    });
    const aggregate = (items) => {
        const total = items.reduce((acc, item) => {
            acc.avgWaitTime += item.avgWaitTime;
            acc.maxWaitTime += item.maxWaitTime;
            acc.priorityAvgWait += item.priorityAvgWait;
            acc.normalAvgWait += item.normalAvgWait;
            acc.overloadEvents += item.overloadEvents;
            acc.throughput += item.throughput;
            acc.admittedPatients += item.admittedPatients;
            acc.completedPatients += item.completedPatients;
            acc.unfinishedPatients += item.unfinishedPatients;
            acc.rejectedOrDeferredPatients += item.rejectedOrDeferredPatients;
            acc.avgRoomUtilization += item.avgRoomUtilization;
            return acc;
        }, {
            avgWaitTime: 0,
            maxWaitTime: 0,
            priorityAvgWait: 0,
            normalAvgWait: 0,
            overloadEvents: 0,
            throughput: 0,
            admittedPatients: 0,
            completedPatients: 0,
            unfinishedPatients: 0,
            rejectedOrDeferredPatients: 0,
            avgRoomUtilization: 0,
        });
        return {
            avgWaitTime: Number((total.avgWaitTime / items.length).toFixed(1)),
            maxWaitTime: Number((total.maxWaitTime / items.length).toFixed(1)),
            priorityAvgWait: Number((total.priorityAvgWait / items.length).toFixed(1)),
            normalAvgWait: Number((total.normalAvgWait / items.length).toFixed(1)),
            overloadEvents: Number((total.overloadEvents / items.length).toFixed(1)),
            throughput: Number((total.throughput / items.length).toFixed(1)),
            admittedPatients: Number((total.admittedPatients / items.length).toFixed(1)),
            completedPatients: Number((total.completedPatients / items.length).toFixed(1)),
            unfinishedPatients: Number((total.unfinishedPatients / items.length).toFixed(1)),
            rejectedOrDeferredPatients: Number((total.rejectedOrDeferredPatients / items.length).toFixed(1)),
            avgRoomUtilization: Number((total.avgRoomUtilization / items.length).toFixed(3)),
        };
    };
    const withSuggestion = aggregate(results.map(item => item.withSuggestion));
    const random = aggregate(results.map(item => item.random));
    return {
        withSuggestion,
        random,
        comparison: {
            avgWaitTime: Number((((withSuggestion.avgWaitTime - random.avgWaitTime) / random.avgWaitTime) * 100 || 0).toFixed(1)),
            maxWaitTime: Number((((withSuggestion.maxWaitTime - random.maxWaitTime) / random.maxWaitTime) * 100 || 0).toFixed(1)),
            priorityAvgWait: Number((((withSuggestion.priorityAvgWait - random.priorityAvgWait) / random.priorityAvgWait) * 100 || 0).toFixed(1)),
            normalAvgWait: Number((((withSuggestion.normalAvgWait - random.normalAvgWait) / random.normalAvgWait) * 100 || 0).toFixed(1)),
            overloadEvents: Number((((withSuggestion.overloadEvents - random.overloadEvents) / random.overloadEvents) * 100 || 0).toFixed(1)),
            throughput: Number((((withSuggestion.throughput - random.throughput) / random.throughput) * 100 || 0).toFixed(1)),
            admittedPatients: Number((((withSuggestion.admittedPatients - random.admittedPatients) / random.admittedPatients) * 100 || 0).toFixed(1)),
            completedPatients: Number((((withSuggestion.completedPatients - random.completedPatients) / random.completedPatients) * 100 || 0).toFixed(1)),
            unfinishedPatients: Number((((withSuggestion.unfinishedPatients - random.unfinishedPatients) / random.unfinishedPatients) * 100 || 0).toFixed(1)),
            rejectedOrDeferredPatients: Number((((withSuggestion.rejectedOrDeferredPatients - random.rejectedOrDeferredPatients) / random.rejectedOrDeferredPatients) * 100 || 0).toFixed(1)),
            avgRoomUtilization: Number((((withSuggestion.avgRoomUtilization - random.avgRoomUtilization) / random.avgRoomUtilization) * 100 || 0).toFixed(1)),
        },
        config,
    };
}
function formatSimulationReport(summary) {
    const rows = [
        ['Thoi gian cho TB', `${summary.withSuggestion.avgWaitTime} phut`, `${summary.random.avgWaitTime} phut`, `${summary.comparison.avgWaitTime}%`],
        ['Thoi gian cho max', `${summary.withSuggestion.maxWaitTime} phut`, `${summary.random.maxWaitTime} phut`, `${summary.comparison.maxWaitTime}%`],
        ['Cho TB nhom uu tien', `${summary.withSuggestion.priorityAvgWait} phut`, `${summary.random.priorityAvgWait} phut`, `${summary.comparison.priorityAvgWait}%`],
        ['Cho TB nhom thuong', `${summary.withSuggestion.normalAvgWait} phut`, `${summary.random.normalAvgWait} phut`, `${summary.comparison.normalAvgWait}%`],
        ['So BN tiep nhan', `${summary.withSuggestion.admittedPatients}`, `${summary.random.admittedPatients}`, `${summary.comparison.admittedPatients}%`],
        ['So BN hoan tat', `${summary.withSuggestion.completedPatients}`, `${summary.random.completedPatients}`, `${summary.comparison.completedPatients}%`],
        ['So BN chua xong', `${summary.withSuggestion.unfinishedPatients}`, `${summary.random.unfinishedPatients}`, `${summary.comparison.unfinishedPatients}%`],
        ['So BN hoac tre', `${summary.withSuggestion.rejectedOrDeferredPatients}`, `${summary.random.rejectedOrDeferredPatients}`, `${summary.comparison.rejectedOrDeferredPatients}%`],
        ['Hieu suat phong', `${summary.withSuggestion.avgRoomUtilization}`, `${summary.random.avgRoomUtilization}`, `${summary.comparison.avgRoomUtilization}%`],
        ['Su kien qua tai', `${summary.withSuggestion.overloadEvents}`, `${summary.random.overloadEvents}`, `${summary.comparison.overloadEvents}%`],
        ['Throughput (BN/ca)', `${summary.withSuggestion.throughput}`, `${summary.random.throughput}`, `${summary.comparison.throughput}%`],
    ];
    const lines = [
        '============================================',
        '  KET QUA GIA LAP DIEU PHOI BENH NHAN',
        `  So lan chay: ${summary.config.numRuns} | So phong: ${summary.config.numRooms} | Ca: ${summary.config.totalMinutes} phut`,
        '============================================',
        '',
        '                      CO HE THONG   KHONG CO HE THONG   CHENH LECH',
        ...rows.map(row => `${row[0].padEnd(24)} ${String(row[1]).padEnd(14)} ${String(row[2]).padEnd(18)} ${row[3]}`),
        '',
        '============================================',
        'Ket qua se duoc luu tai: backend/src/simulation/results/simulation-result.json',
        '============================================',
    ];
    return lines.join('\n');
}
async function writeSimulationResult(summary) {
    const resultDir = (0, node_path_1.resolve)(process.cwd(), 'src', 'simulation', 'results');
    const outputPath = (0, node_path_1.resolve)(resultDir, 'simulation-result.json');
    await (0, promises_1.mkdir)(resultDir, { recursive: true });
    await (0, promises_1.writeFile)(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    return outputPath;
}
async function main() {
    const summary = runSimulation(exports.SIMULATION_CONFIG);
    console.log(formatSimulationReport(summary));
    const outputPath = await writeSimulationResult(summary);
    console.log(`\nDa luu ket qua tai: ${outputPath}`);
}
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('dispatch-simulation.ts')) {
    void main();
}
