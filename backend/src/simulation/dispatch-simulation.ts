import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type SimulationAlertLevel = 'NORMAL' | 'WARNING' | 'OVERLOAD';
export type SimulationStrategy = 'WITH_SUGGESTION' | 'RANDOM';

export interface SimulationConfig {
  totalMinutes: number;
  numRooms: number;
  roomCapacity: number;
  avgServiceTime: number;
  arrivalRates: {
    peak: { from: number; to: number; rate: number };
    normal: { from: number; to: number; rate: number };
    offpeak: { from: number; to: number; rate: number };
  };
  priorityRatio: number;
  numRuns: number;
}

export interface SimulationResult {
  avgWaitTime: number;
  maxWaitTime: number;
  priorityAvgWait: number;
  normalAvgWait: number;
  overloadEvents: number;
  throughput: number;
  admittedPatients: number;
  completedPatients: number;
  unfinishedPatients: number;
  rejectedOrDeferredPatients: number;
  avgRoomUtilization: number;
}

export interface SimulationComparison {
  withSuggestion: SimulationResult;
  random: SimulationResult;
  comparison: {
    avgWaitTime: number;
    maxWaitTime: number;
    priorityAvgWait: number;
    normalAvgWait: number;
    overloadEvents: number;
    throughput: number;
    admittedPatients: number;
    completedPatients: number;
    unfinishedPatients: number;
    rejectedOrDeferredPatients: number;
    avgRoomUtilization: number;
  };
  config: SimulationConfig;
}

export interface SimulatedRoom {
  id: string;
  name: string;
  roomType: 'EXAM' | 'LAB' | 'IMAGING' | 'OTHER';
  queueLength: number;
  utilizationRate: number;
  alertLevel: SimulationAlertLevel;
  avgServiceTime: number;
  active?: boolean;
  currentLoad?: number;
}

export interface SuggestionContext {
  currentRoomId?: string | null;
  isPriority?: boolean;
  sameDoctorRequired?: boolean;
}

export interface RoomSuggestion {
  room: SimulatedRoom;
  resourceScore: number;
  queueLength: number;
  utilizationRate: number;
  estimatedWaitMinutes: number;
  alertLevel: SimulationAlertLevel;
  reason: string;
  wasSelected: boolean;
  rank: number;
}

export interface PatientSimulation {
  id: string;
  arrivalMinute: number;
  isPriority: boolean;
}

export const SIMULATION_CONFIG: SimulationConfig = {
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
const alertPenalty: Record<SimulationAlertLevel, number> = {
  NORMAL: 0,
  WARNING: 8,
  OVERLOAD: 18,
};

const createRng = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) % 4294967296;
    return value / 4294967296;
  };
};

const getRateForMinute = (minute: number, config: SimulationConfig) => {
  if (minute >= config.arrivalRates.peak.from && minute < config.arrivalRates.peak.to) {
    return config.arrivalRates.peak.rate;
  }

  if (minute >= config.arrivalRates.normal.from && minute < config.arrivalRates.normal.to) {
    return config.arrivalRates.normal.rate;
  }

  return config.arrivalRates.offpeak.rate;
};

const fallbackRooms = (rooms: SimulatedRoom[]) => {
  const activeRooms = rooms.filter(room => room.active !== false);
  const primary = activeRooms.filter(room => room.utilizationRate < 1.0);
  if (primary.length > 0) {
    return primary;
  }

  const levelOneFallback = activeRooms.filter(room => room.utilizationRate < 1.2);
  return levelOneFallback;
};

type RuntimeRoom = SimulatedRoom & {
  availableAt: number;
  waitingQueue: Array<{
    arrivalMinute: number;
    startMinute: number;
    finishMinute: number;
    waitMinutes: number;
    isPriority: boolean;
  }>;
  serviceMinutesInWindow: number;
};

const createRuntimeRooms = (rooms: SimulatedRoom[]): RuntimeRoom[] =>
  rooms.map(room => ({
    ...room,
    availableAt: 0,
    waitingQueue: [],
    serviceMinutesInWindow: 0,
  }));

const releaseCompletedPatients = (
  rooms: RuntimeRoom[],
  currentMinute: number,
  totals: {
    waits: number[];
    priorityWaits: number[];
    normalWaits: number[];
    completedPatients: number;
  },
) => {
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
      } else {
        totals.normalWaits.push(completed.waitMinutes);
      }
    }
  }
};

const finalizeUnfinishedPatients = (rooms: RuntimeRoom[]) =>
  rooms.reduce((sum, room) => sum + room.waitingQueue.length, 0);

const snapshotRuntimeRooms = (rooms: RuntimeRoom[], config: Pick<SimulationConfig, 'roomCapacity'>): SimulatedRoom[] =>
  rooms.map(room => ({
    id: room.id,
    name: room.name,
    roomType: room.roomType,
    queueLength: room.waitingQueue.length,
    utilizationRate: Math.min(1.5, room.waitingQueue.length / config.roomCapacity),
    alertLevel:
      room.waitingQueue.length / config.roomCapacity >= 1.2
        ? 'OVERLOAD'
        : room.waitingQueue.length / config.roomCapacity >= 0.85
          ? 'WARNING'
          : 'NORMAL',
    avgServiceTime: room.avgServiceTime,
    active: room.active,
    currentLoad: room.waitingQueue.length,
  }));

const chooseRandomRoom = (rooms: SimulatedRoom[], rng: () => number) => {
  if (rooms.length === 0) {
    return null;
  }

  const index = Math.floor(rng() * rooms.length);
  return rooms[Math.min(index, rooms.length - 1)] ?? null;
};

export function scoreRoomForSuggestion(room: SimulatedRoom, context: SuggestionContext = {}) {
  const queuePenalty = room.queueLength * 6;
  const utilizationPenalty = room.utilizationRate * 40;
  const currentRoomBonus = context.currentRoomId && context.currentRoomId === room.id ? 12 : 0;
  const priorityBonus = context.isPriority ? 6 : 0;
  const sameDoctorBonus = context.sameDoctorRequired && context.currentRoomId === room.id ? 10 : 0;
  const score = 100 - queuePenalty - utilizationPenalty - alertPenalty[room.alertLevel] + currentRoomBonus + priorityBonus + sameDoctorBonus;

  return Math.max(0, Math.round(score));
}

export function rankRoomSuggestions(
  rooms: SimulatedRoom[],
  context: SuggestionContext = {},
): RoomSuggestion[] {
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
        reason:
          room.alertLevel === 'NORMAL'
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

export function chooseRoom(
  rooms: SimulatedRoom[],
  context: SuggestionContext = {},
): RoomSuggestion | null {
  const suggestions = rankRoomSuggestions(rooms, context);
  return suggestions[0] ?? null;
}

export function buildSimulationRooms(numRooms: number, config: Pick<SimulationConfig, 'avgServiceTime'>): SimulatedRoom[] {
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

export function simulateScenario(
  patients: PatientSimulation[],
  rooms: SimulatedRoom[],
  strategy: SimulationStrategy,
  config: Pick<SimulationConfig, 'roomCapacity' | 'avgServiceTime' | 'totalMinutes'>,
  rng: () => number = createRng(42),
) {
  const stateRooms = createRuntimeRooms(rooms);
  const waits: number[] = [];
  const priorityWaits: number[] = [];
  const normalWaits: number[] = [];
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

    const room =
      strategy === 'WITH_SUGGESTION'
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
  const avgRoomUtilization =
    stateRooms.length === 0
      ? 0
      : Number(
          (
            stateRooms.reduce((sum, room) => sum + room.serviceMinutesInWindow, 0) /
            (stateRooms.length * config.totalMinutes)
          ).toFixed(3),
        );

  const average = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

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
  } satisfies SimulationResult;
}

export function generatePatients(config: SimulationConfig, seed: number): PatientSimulation[] {
  const rng = createRng(seed);
  const patients: PatientSimulation[] = [];

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

export function runSingleSimulation(
  config: SimulationConfig,
  strategy: SimulationStrategy,
  seed: number,
) {
  const rooms = buildSimulationRooms(config.numRooms, config);
  const patients = generatePatients(config, seed);
  return simulateScenario(patients, rooms, strategy, config);
}

export function runSimulation(config: SimulationConfig = SIMULATION_CONFIG): SimulationComparison {
  const runs = Math.max(1, config.numRuns);
  const results = Array.from({ length: runs }, (_, index) => {
    const seed = index + 1;
    return {
      withSuggestion: runSingleSimulation(config, 'WITH_SUGGESTION', seed),
      random: runSingleSimulation(config, 'RANDOM', seed),
    };
  });

const aggregate = (items: Array<Record<keyof SimulationResult, number>>) => {
    const total = items.reduce(
      (acc, item) => {
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
      },
      {
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
      },
    );

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
    } satisfies SimulationResult;
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

export function formatSimulationReport(summary: SimulationComparison) {
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

export async function writeSimulationResult(summary: SimulationComparison) {
  const resultDir = resolve(process.cwd(), 'src', 'simulation', 'results');
  const outputPath = resolve(resultDir, 'simulation-result.json');
  await mkdir(resultDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  return outputPath;
}

export async function main() {
  const summary = runSimulation(SIMULATION_CONFIG);
  console.log(formatSimulationReport(summary));
  const outputPath = await writeSimulationResult(summary);
  console.log(`\nDa luu ket qua tai: ${outputPath}`);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('dispatch-simulation.ts')) {
  void main();
}
