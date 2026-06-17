"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRooms = void 0;
const prisma_1 = require("../../lib/prisma");
const getRooms = async (query) => {
    const where = {};
    const status = query.status?.toLowerCase();
    if (status === 'active') {
        where.isActive = true;
    }
    else if (status === 'inactive') {
        where.isActive = false;
    }
    if (query.search) {
        where.OR = [
            { name: { contains: query.search } },
            { code: { contains: query.search } },
            { department: { name: { contains: query.search } } },
            { department: { code: { contains: query.search } } },
        ];
    }
    const [total, items] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.room.count({ where }),
        prisma_1.prisma.room.findMany({
            where,
            orderBy: [{ createdAt: query.sort }, { name: 'asc' }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            select: {
                id: true,
                name: true,
                code: true,
                roomType: true,
                capacity: true,
                avgServiceTime: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                _count: {
                    select: {
                        serviceRooms: true,
                        schedules: true,
                        appointments: true,
                        targetQueueItems: true,
                        turns: true,
                        resourceLoads: true,
                        queueSnapshots: true,
                    },
                },
            },
        }),
    ]);
    return { items, total };
};
exports.getRooms = getRooms;
