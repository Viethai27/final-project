"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const vitest_1 = require("vitest");
exports.prisma = {
    $transaction: vitest_1.vi.fn(),
    room: {
        findMany: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
    },
    resourceLoad: {
        findMany: vitest_1.vi.fn(),
    },
    queueItem: {
        findMany: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
    },
    doctorProfile: {
        findMany: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
    },
    serviceRoom: {
        findMany: vitest_1.vi.fn(),
    },
    visit: {
        findMany: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
        count: vitest_1.vi.fn(),
    },
    dispatchDecision: {
        findMany: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
        create: vitest_1.vi.fn(),
        count: vitest_1.vi.fn(),
    },
    user: {
        findUnique: vitest_1.vi.fn(),
    },
    serviceCatalog: {
        findUnique: vitest_1.vi.fn(),
    },
};
