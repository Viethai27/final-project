import { apiGet, apiSend } from './http';
import type { AuthLoginResultDto, AuthMeResultDto } from './backend-types';

export const authApi = {
  login: (body: { username: string; password: string }) =>
    apiSend<AuthLoginResultDto>('/auth/login', { method: 'POST', body }),
  me: () => apiGet<AuthMeResultDto>('/auth/me'),
  logout: () => apiSend<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' }),
};
