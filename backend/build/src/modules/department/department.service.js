"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepartments = void 0;
const prisma_1 = require("../../lib/prisma");
const getDepartments = async (query) => {
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
            { description: { contains: query.search } },
        ];
    }
    const [total, items] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.department.count({ where }),
        prisma_1.prisma.department.findMany({
            where,
            orderBy: [{ createdAt: query.sort }, { name: 'asc' }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            select: {
                id: true,
                name: true,
                code: true,
                description: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        users: true,
                        doctors: true,
                        rooms: true,
                    },
                },
            },
        }),
    ]);
    return { items, total };
};
exports.getDepartments = getDepartments;
