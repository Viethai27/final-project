import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { type ListQueryParams } from '../../shared/list-query';

export const getRooms = async (query: ListQueryParams) => {
  const where: Prisma.RoomWhereInput = {};
  const status = query.status?.toLowerCase();

  if (status === 'active') {
    where.isActive = true;
  } else if (status === 'inactive') {
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

  const [total, items] = await prisma.$transaction([
    prisma.room.count({ where }),
    prisma.room.findMany({
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
