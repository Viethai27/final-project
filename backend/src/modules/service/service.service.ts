import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { type ListQueryParams } from '../../shared/list-query';

const serviceTypes = new Set(['EXAM', 'LAB', 'IMAGING', 'OTHER']);

export const getServices = async (query: ListQueryParams) => {
  const where: Prisma.ServiceCatalogWhereInput = {};
  const status = query.status?.toLowerCase();

  if (status === 'active') {
    where.isActive = true;
  } else if (status === 'inactive') {
    where.isActive = false;
  }

  if (query.search) {
    where.OR = [{ name: { contains: query.search } }, { code: { contains: query.search } }];

    const serviceType = query.search.toUpperCase();
    if (serviceTypes.has(serviceType)) {
      where.OR.push({ serviceType: serviceType as any });
    }
  }

  const [total, items] = await prisma.$transaction([
    prisma.serviceCatalog.count({ where }),
    prisma.serviceCatalog.findMany({
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
