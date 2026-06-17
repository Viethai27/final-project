export type SortOrder = 'asc' | 'desc';

export interface ListQueryParams {
  search?: string;
  status?: string;
  page: number;
  limit: number;
  sort: SortOrder;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const toText = (value: unknown) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    const trimmed = value[0].trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
};

const toPositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(toText(value) ?? '', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
};

export const parseListQuery = (
  query: Record<string, unknown>,
  options?: {
    defaultLimit?: number;
    defaultSort?: SortOrder;
  },
): ListQueryParams => {
  const page = toPositiveInt(query.page, 1);
  const limit = Math.min(
    MAX_LIMIT,
    toPositiveInt(query.limit, options?.defaultLimit ?? DEFAULT_LIMIT),
  );
  const rawSort = toText(query.sort);
  const sort: SortOrder = rawSort === 'asc' ? 'asc' : options?.defaultSort ?? 'desc';

  return {
    search: toText(query.search),
    status: toText(query.status),
    page,
    limit,
    sort,
  };
};

export const buildPagination = (total: number, page: number, limit: number) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

