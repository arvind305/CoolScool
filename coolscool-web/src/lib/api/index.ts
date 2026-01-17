/**
 * API Module
 *
 * Exports API client, endpoints, and types.
 */

export { api, apiRequest, configureAPIClient, APIError } from './client';
export type { APIClientConfig } from './client';

export { API_BASE_URL, ENDPOINTS } from './endpoints';

export type {
  APIResponse,
  APIErrorData,
  PaginationParams,
  PaginatedResponse,
  UserSettings,
  LinkedChild,
  ChildProgressSummary,
  ActivityItem,
  ChildFullProgress,
  ChildSession,
  UserProgress,
  TopicProgress,
  ProgressSummary,
} from './types';
