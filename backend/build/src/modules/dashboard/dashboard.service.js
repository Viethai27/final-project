"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardOverview = void 0;
const prisma_1 = require("../../lib/prisma");
const waitingStates = [
    'WAITING_EXAM',
    'WAITING_CLS',
    'WAITING_RESULT',
    'WAITING_CONCLUSION',
    'WAITING_PAYMENT',
];
const activeQueueStatuses = ['WAITING', 'CALLED', 'SERVING'];
const getDashboardOverview = async () => {
    const [totalPatients, totalDoctors, totalVisits, waitingPatients, activeQueues, completedVisits,] = await Promise.all([
        prisma_1.prisma.patient.count(),
        prisma_1.prisma.doctorProfile.count(),
        prisma_1.prisma.visit.count(),
        prisma_1.prisma.visitProgress.count({
            where: {
                currentState: {
                    in: [...waitingStates],
                },
            },
        }),
        prisma_1.prisma.queueItemStatus.count({
            where: {
                status: {
                    in: [...activeQueueStatuses],
                },
            },
        }),
        prisma_1.prisma.visitProgress.count({
            where: {
                currentState: 'COMPLETED',
            },
        }),
    ]);
    return {
        totalPatients,
        totalDoctors,
        totalVisits,
        waitingPatients,
        activeQueues,
        completedVisits,
    };
};
exports.getDashboardOverview = getDashboardOverview;
