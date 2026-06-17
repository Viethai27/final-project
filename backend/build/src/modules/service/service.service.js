"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServices = void 0;
const prisma_1 = require("../../lib/prisma");
const serviceTypes = new Set(['EXAM', 'LAB', 'IMAGING', 'OTHER']);
const getServices = async (query) => {
    const where = {};
    const status = query.status?.toLowerCase();
    if (status === 'active') {
        where.isActive = true;
    }
    else if (status === 'inactive') {
        where.isActive = false;
    }
    if (query.search) {
        where.OR = [{ name: { contains: query.search } }, { code: { contains: query.search } }];
        const serviceType = query.search.toUpperCase();
        if (serviceTypes.has(serviceType)) {
            where.OR.push({ serviceType: serviceType });
        }
    }
    const [total, items] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.serviceCatalog.count({ where }),
        prisma_1.prisma.serviceCatalog.findMany({
            where,
            orderBy: [{ createdAt: query.sort }, { name: 'asc' }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            select: {
                id: true,
                name: true,
                code: true,
                serviceType: true,
                roomTypeRequired: true,
                isUrgentCls: true,
                targetWaitTime: true,
                avgDuration: true,
                price: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                serviceRooms: {
                    where: {
                        isActive: true,
                    },
                    select: {
                        id: true,
                        isActive: true,
                        room: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                roomType: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        serviceRooms: true,
                        appointments: true,
                        clsOrders: true,
                        turns: true,
                        invoiceItems: true,
                        dispatchOutcomes: true,
                    },
                },
            },
        }),
    ]);
    return { items, total };
};
exports.getServices = getServices;
