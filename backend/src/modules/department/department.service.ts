import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { type ListQueryParams } from '../../shared/list-query';

export const getDepartments = async (query: ListQueryParams) => {
  const where: Prisma.DepartmentWhereInput = {};
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
      { description: { contains: query.search } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.department.count({ where }),
    prisma.department.findMany({
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
