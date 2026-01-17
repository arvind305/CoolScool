/**
 * Queries Index
 *
 * Export all React Query hooks and utilities.
 */

export { getQueryClient, makeQueryClient } from './query-client';
export { queryKeys } from './keys';

// Settings
export {
  useSettingsQuery,
  useUpdateSettingsMutation,
  useSettings,
} from './use-settings-query';

// Progress
export {
  useProgressQuery,
  useProgressSummaryQuery,
  useTopicProgressQuery,
  useExportProgressMutation,
  useImportProgressMutation,
  useResetProgressMutation,
  useProgress,
} from './use-progress-query';

// Sessions
export {
  useSessionsQuery,
  useSessionDetailQuery,
  useSessionSummaryQuery,
  useSessions,
} from './use-sessions-query';

// Parent
export {
  useChildrenQuery,
  useLinkChildMutation,
  useUnlinkChildMutation,
  useGrantConsentMutation,
  useRevokeConsentMutation,
  useChildProgressQuery,
  useChildSessionsQuery,
  useActivityQuery,
  useParentDashboard,
  useChildManagement,
  useChildView,
} from './use-parent-queries';
