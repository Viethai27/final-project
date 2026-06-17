import { apiGet } from './http';
import type { ListQuery, RoomDto } from './backend-types';

export const roomApi = {
  list: (query?: ListQuery) =>
    apiGet<RoomDto[]>('/rooms', query as Record<string, string | number | boolean | undefined | null> | undefined),
};
