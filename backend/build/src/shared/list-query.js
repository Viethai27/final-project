"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPagination = exports.parseListQuery = void 0;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const toText = (value) => {
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
const toPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(toText(value) ?? '', 10);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }
    return fallback;
};
const parseListQuery = (query, options) => {
    const page = toPositiveInt(query.page, 1);
    const limit = Math.min(MAX_LIMIT, toPositiveInt(query.limit, options?.defaultLimit ?? DEFAULT_LIMIT));
    const rawSort = toText(query.sort);
    const sort = rawSort === 'asc' ? 'asc' : options?.defaultSort ?? 'desc';
    return {
        search: toText(query.search),
        status: toText(query.status),
        page,
        limit,
        sort,
    };
};
exports.parseListQuery = parseListQuery;
const buildPagination = (total, page, limit) => ({
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});
exports.buildPagination = buildPagination;
