/**
 * Stores Index
 *
 * Export all Zustand stores.
 */

export {
  useQuizStore,
  selectIsQuizActive,
  selectCurrentQuestion,
  selectSession,
  selectIsShowingFeedback,
  selectLastAnswerResult,
  selectQuizProgress,
  selectQuizError,
  selectIsSubmitting,
} from './quiz-store';

export {
  useContextStore,
  selectContext,
  selectTopic,
  selectHasTopic,
} from './context-store';

export {
  useUIStore,
  selectIsLoading,
  selectLoadingMessage,
  selectToasts,
  selectActiveModal,
  selectModalProps,
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  showWarningToast,
} from './ui-store';

export type { Toast } from './ui-store';
