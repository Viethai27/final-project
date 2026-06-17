import { prisma } from '../../lib/prisma';

const waitingStates = [
  'WAITING_EXAM',
  'WAITING_CLS',
  'WAITING_RESULT',
  'WAITING_CONCLUSION',
  'WAITING_PAYMENT',
] as const;

const activeQueueStatuses = ['WAITING', 'CALLED', 'SERVING'] as const;

export const getDashboardOverview = async () => {
  const [
    totalPatients,
    totalDoctors,
    totalVisits,
    waitingPatients,
    activeQueues,
    completedVisits,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.doctorProfile.count(),
    prisma.visit.count(),
    prisma.visitProgress.count({
      where: {
        currentState: {
          in: [...waitingStates],
        },
      },
    }),
    prisma.queueItemStatus.count({
      where: {
        status: {
          in: [...activeQueueStatuses],
        },
      },
    }),
    prisma.visitProgress.count({
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
