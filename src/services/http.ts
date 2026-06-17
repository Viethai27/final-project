import type { ApiResponse, ApiSuccess } from './backend-types';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '/api';
const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 15000;
const AUTH_TOKEN_STORAGE_KEY = 'mediflow_auth_token';
const BACKEND_OFFLINE_MESSAGE = `Không kết nối được backend/API tại ${API_BASE_URL}. Hãy chạy backend hoặc dùng npm run dev để chạy cả frontend và backend.`;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Request failed.';
}

function isNetworkFailure(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    error.name === 'AbortError' ||
    error.name === 'TypeError' ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network error') ||
    message.includes('connection refused') ||
    message.includes('connection closed')
  );
}

function sanitizeResponseText(text: string) {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>) {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
  return `${API_BASE_URL}${path}${buildQuery(params)}`;
}

function isApiSuccess<T>(payload: ApiResponse<T> | null): payload is ApiSuccess<T> {
  return Boolean(payload && typeof payload === 'object' && 'success' in payload && payload.success === true && 'data' in payload);
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function buildHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const token = getAuthToken();

  if (token && !nextHeaders.has('Authorization')) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  }

  return nextHeaders;
}

async function parseResponse<T>(response: Response): Promise<ApiSuccess<T>> {
  const text = await response.text();
  const trimmedText = text.trim();
  let payload: ApiResponse<T> | null = null;

  if (trimmedText) {
    try {
      payload = JSON.parse(trimmedText) as ApiResponse<T>;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (payload && payload.success === false) {
      throw new ApiError(payload.message || `HTTP ${response.status} ${response.statusText || 'Request failed.'}`, response.status);
    }

    const bodyMessage = trimmedText ? sanitizeResponseText(trimmedText) : '';
    throw new ApiError(bodyMessage || `HTTP ${response.status} ${response.statusText || 'Request failed.'}`, response.status);
  }

  if (!payload) {
    throw new ApiError(
      trimmedText
        ? 'Phản hồi từ backend không phải JSON hợp lệ.'
        : 'Phản hồi từ backend bị trống.',
      response.status,
    );
  }

  if (payload.success === false) {
    throw new ApiError(payload.message || 'Request failed.', response.status);
  }

  if (!isApiSuccess(payload)) {
    throw new ApiError('Response format không đúng. Backend phải trả { success: true, data, pagination? }.', response.status);
  }

  return payload;
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
  const url = buildUrl(path, params);

  try {
    const response = await fetchWithTimeout(url, {
      headers: buildHeaders(),
    });
    return parseResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('[API] GET failed', { url, status: error.status, message: error.message });
      throw error;
    }

    const apiError = new ApiError(isNetworkFailure(error) ? BACKEND_OFFLINE_MESSAGE : getErrorMessage(error), 503);
    console.error('[API] GET failed', { url, status: apiError.status, message: apiError.message });
    throw apiError;
  }
}

export async function apiSend<T>(
  path: string,
  options: {
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: unknown;
  },
) {
  const url = buildUrl(path);

  try {
    const response = await fetchWithTimeout(url, {
      method: options.method,
      headers: buildHeaders({
        'Content-Type': 'application/json',
      }),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    return parseResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('[API] request failed', { url, method: options.method, status: error.status, message: error.message });
      throw error;
    }

    const apiError = new ApiError(isNetworkFailure(error) ? BACKEND_OFFLINE_MESSAGE : getErrorMessage(error), 503);
    console.error('[API] request failed', { url, method: options.method, status: apiError.status, message: apiError.message });
    throw apiError;
  }
}

export { API_BASE_URL, buildQuery };
