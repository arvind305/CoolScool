/**
 * API Client
 *
 * Unified API client with automatic token injection and error handling.
 */

import { API_BASE_URL } from './endpoints';
import type { APIResponse, APIErrorData } from './types';

// ============================================
// ERROR CLASS
// ============================================

export class APIError extends Error {
  code: string;
  status: number;
  details?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    code: string = 'API_ERROR',
    status: number = 500,
    details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static isAPIError(error: unknown): error is APIError {
    return error instanceof APIError;
  }

  static isAuthError(error: unknown): boolean {
    return APIError.isAPIError(error) && (
      error.code === 'UNAUTHORIZED' ||
      error.code === 'AUTH_EXPIRED' ||
      error.status === 401
    );
  }
}

// ============================================
// CLIENT CONFIGURATION
// ============================================

export interface APIClientConfig {
  getAccessToken: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}

let clientConfig: APIClientConfig | null = null;

/**
 * Configure the API client with token getter and callbacks
 */
export function configureAPIClient(config: APIClientConfig): void {
  clientConfig = config;
}

// ============================================
// REQUEST FUNCTION
// ============================================

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

/**
 * Make an API request with automatic token injection
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, skipAuth, ...fetchOptions } = options;

  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Add auth token if available and not skipped
  if (!skipAuth && clientConfig?.getAccessToken) {
    const token = await clientConfig.getAccessToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  // Build request
  const requestInit: RequestInit = {
    ...fetchOptions,
    headers,
  };

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  // Make request
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, requestInit);

  // Handle 401 Unauthorized
  if (response.status === 401) {
    clientConfig?.onUnauthorized?.();
    throw new APIError('Session expired', 'AUTH_EXPIRED', 401);
  }

  // Parse response
  let data: APIResponse<T>;
  try {
    data = await response.json();
  } catch {
    throw new APIError(
      `Request failed: ${response.status} ${response.statusText}`,
      'PARSE_ERROR',
      response.status
    );
  }

  // Handle error responses
  if (!response.ok || !data.success) {
    const error = data.error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' };
    throw new APIError(
      error.message,
      error.code,
      response.status,
      error.details
    );
  }

  return data.data;
}

// ============================================
// CONVENIENCE METHODS
// ============================================

export const api = {
  /**
   * GET request
   */
  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: 'GET' });
  },

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: 'POST', body });
  },

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: 'PUT', body });
  },

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: 'DELETE', body });
  },
};

export default api;
