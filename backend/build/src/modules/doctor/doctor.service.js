"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDoctors = void 0;
const prisma_1 = require("../../lib/prisma");
const http_error_1 = require("../../shared/http-error");
const getDoctors = async (query) => {
    const where = {};
    const status = query.status?.toLowerCase();
    if (status === 'active') {
        where.isActive = true;
    }
    else if (status === 'inactive') {
        where.isActive = false;
    }
    if (query.departmentId) {
        const department = await prisma_1.prisma.department.findUnique({
            where: { id: query.departmentId },
            select: { id: true },
        });
        if (!department) {
            throw new http_error_1.AppError('Department not found.', 404);
        }
        where.departmentId = department.id;
    }
    if (query.search) {
        where.OR = [
            { name: { contains: query.search } },
            { specialty: { contains: query.search } },
            { licenseNumber: { contains: query.search } },
            { user: { username: { contains: query.search } } },
            { user: { fullName: { contains: query.search } } },
            { user: { email: { contains: query.search } } },
            { department: { name: { contains: query.search } } },
            { department: { code: { contains: query.search } } },
        ];
    }
    const [total, items] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.doctorProfile.count({ where }),
        prisma_1.prisma.doctorProfile.findMany({
            where,
            orderBy: [{ createdAt: query.sort }, { name: 'asc' }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            select: {
                id: true,
                name: true,
                specialty: true,
                licenseNumber: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        email: true,
                        role: true,
                        isActive: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                defaultRoom: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        roomType: true,
                    },
                },
                schedules: {
                    orderBy: [{ workDate: 'desc' }],
                    take: 5,
                    select: {
                        id: true,
                        workDate: true,
                        shift: true,
                        startTime: true,
                        endTime: true,
                        maxPatients: true,
                        isActive: true,
                        room: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        schedules: true,
                        appointments: true,
                        assignments: true,
                        clsOrders: true,
                        turns: true,
                        targetQueueItems: true,
                        dispatchRecommendationsAsOutcomeDoctor: true,
                    },
                },
            },
        }),
    ]);
    return { items, total };
};
exports.getDoctors = getDoctors;
