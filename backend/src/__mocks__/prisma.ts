import { vi } from 'vitest';

export const prisma = {
  $transaction: vi.fn(),
  room: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  resourceLoad: {
    findMany: vi.fn(),
  },
  queueItem: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  doctorProfile: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  serviceRoom: {
    findMany: vi.fn(),
  },
  visit: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  dispatchDecision: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  serviceCatalog: {
    findUnique: vi.fn(),
  },
};
