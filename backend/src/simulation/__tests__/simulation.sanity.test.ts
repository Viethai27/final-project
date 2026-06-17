import { describe, expect, it } from 'vitest';
import {
  buildSimulationRooms,
  chooseRoom,
  rankRoomSuggestions,
  runSimulation,
  simulateScenario,
  type PatientSimulation,
  type SimulationConfig,
} from '../dispatch-simulation';

describe('Simulation sanity checks', () => {
  it('TC-S1: room rong duoc chon thay cho room day', () => {
    // Nghiep vu: khi co 1 phong rong va 1 phong qua tai, he thong phai chon phong rong.
    const rooms = [
      { id: 'room-empty', name: 'Phong rong', roomType: 'EXAM' as const, queueLength: 0, utilizationRate: 0.2, alertLevel: 'NORMAL' as const, avgServiceTime: 15, active: true, currentLoad: 0 },
      { id: 'room-full', name: 'Phong day', roomType: 'EXAM' as const, queueLength: 8, utilizationRate: 1.1, alertLevel: 'OVERLOAD' as const, avgServiceTime: 15, active: true, currentLoad: 8 },
    ];

    expect(chooseRoom(rooms, { isPriority: false })?.room.id).toBe('room-empty');
  });

  it('TC-S2: benh nhan uu tien co thoi gian cho TB nho hon benh nhan thuong', () => {
    // Nghiep vu: cung mot boi canh, benh nhan uu tien phai co wait trung binh thap hon nhom thuong.
    const patients: PatientSimulation[] = [
      { id: 'p-priority', arrivalMinute: 0, isPriority: true },
      { id: 'p-normal', arrivalMinute: 0, isPriority: false },
    ];
    const rooms = buildSimulationRooms(1, { avgServiceTime: 8 });

    const result = simulateScenario(patients, rooms, 'WITH_SUGGESTION', {
      roomCapacity: 4,
      avgServiceTime: 8,
      totalMinutes: 20,
    });

    expect(result.priorityAvgWait).toBeLessThan(result.normalAvgWait);
  });

  it('TC-S3: avgWaitTime co he thong nho hon random qua 10 runs', () => {
    // Nghiep vu: gom 10 lan chay, he thong co goi y phai tot hon random ve thoi gian cho TB.
    const summary = runSimulation({
      totalMinutes: 60,
      numRooms: 3,
      roomCapacity: 12,
      avgServiceTime: 8,
      arrivalRates: {
        peak: { from: 0, to: 20, rate: 0.9 },
        normal: { from: 20, to: 40, rate: 0.5 },
        offpeak: { from: 40, to: 60, rate: 0.3 },
      },
      priorityRatio: 0.15,
      numRuns: 10,
    } satisfies SimulationConfig);

    expect(summary.withSuggestion.avgWaitTime).toBeLessThan(summary.random.avgWaitTime);
  });

  it('TC-S4: overloadEvents co he thong khong vuot qua random', () => {
    // Nghiep vu: khi dung goi y, so lan qua tai phai giam hoac khong tang.
    const summary = runSimulation({
      totalMinutes: 60,
      numRooms: 3,
      roomCapacity: 12,
      avgServiceTime: 8,
      arrivalRates: {
        peak: { from: 0, to: 20, rate: 0.9 },
        normal: { from: 20, to: 40, rate: 0.5 },
        offpeak: { from: 40, to: 60, rate: 0.3 },
      },
      priorityRatio: 0.15,
      numRuns: 10,
    } satisfies SimulationConfig);

    expect(summary.withSuggestion.overloadEvents).toBeLessThanOrEqual(summary.random.overloadEvents);
  });

  it('TC-S5: throughput khong vuot qua suc chua xu ly toi da trong scenario nho', () => {
    // Nghiep vu: throughput chi tinh so benh nhan hoan tat trong ca, khong phai so benh nhan tiep nhan.
    const config: SimulationConfig = {
      totalMinutes: 20,
      numRooms: 2,
      roomCapacity: 4,
      avgServiceTime: 8,
      arrivalRates: {
        peak: { from: 0, to: 8, rate: 0.4 },
        normal: { from: 8, to: 14, rate: 0.3 },
        offpeak: { from: 14, to: 20, rate: 0.2 },
      },
      priorityRatio: 0.1,
      numRuns: 1,
    };

    const summary = runSimulation(config);
    const maxThroughput = Math.floor(config.totalMinutes / config.avgServiceTime) * config.numRooms;

    expect(summary.withSuggestion.throughput).toBeLessThanOrEqual(maxThroughput);
    expect(summary.random.throughput).toBeLessThanOrEqual(maxThroughput);
    expect(summary.withSuggestion.throughput).toBe(summary.withSuggestion.completedPatients);
    expect(summary.random.throughput).toBe(summary.random.completedPatients);
  });

  it('TC-S6: completed, unfinished va admitted phai khop nhau', () => {
    // Nghiep vu: benh nhan da tiep nhan phai duoc dem vao completed hoac unfinished, khong duoc tinh hai lan.
    const summary = runSimulation({
      totalMinutes: 60,
      numRooms: 3,
      roomCapacity: 12,
      avgServiceTime: 8,
      arrivalRates: {
        peak: { from: 0, to: 20, rate: 0.9 },
        normal: { from: 20, to: 40, rate: 0.5 },
        offpeak: { from: 40, to: 60, rate: 0.3 },
      },
      priorityRatio: 0.15,
      numRuns: 5,
    } satisfies SimulationConfig);

    expect(summary.withSuggestion.completedPatients).toBeLessThanOrEqual(summary.withSuggestion.admittedPatients);
    expect(summary.random.completedPatients).toBeLessThanOrEqual(summary.random.admittedPatients);
    expect(summary.withSuggestion.admittedPatients).toBe(
      summary.withSuggestion.completedPatients + summary.withSuggestion.unfinishedPatients,
    );
    expect(summary.random.admittedPatients).toBe(
      summary.random.completedPatients + summary.random.unfinishedPatients,
    );
  });
});
