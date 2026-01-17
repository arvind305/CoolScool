/**
 * UI Store
 *
 * Zustand store for global UI state including loading, toasts, and modals.
 */

import { create } from 'zustand';

// ============================================
// TYPES
// ============================================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

// ============================================
// STATE INTERFACE
// ============================================

interface UIState {
  // Global loading
  isGlobalLoading: boolean;
  loadingMessage: string | null;

  // Toasts
  toasts: Toast[];

  // Modals
  activeModal: string | null;
  modalProps: Record<string, unknown>;
}

// ============================================
// ACTIONS INTERFACE
// ============================================

interface UIActions {
  // Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Toasts
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Modals
  openModal: (modalId: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Reset
  reset: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: UIState = {
  isGlobalLoading: false,
  loadingMessage: null,
  toasts: [],
  activeModal: null,
  modalProps: {},
};

// ============================================
// STORE
// ============================================

export const useUIStore = create<UIState & UIActions>((set, get) => ({
  ...initialState,

  // Loading
  setGlobalLoading: (loading, message) =>
    set({
      isGlobalLoading: loading,
      loadingMessage: message || null,
    }),

  // Toasts
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration (default 5 seconds)
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () =>
    set({
      toasts: [],
    }),

  // Modals
  openModal: (modalId, props = {}) =>
    set({
      activeModal: modalId,
      modalProps: props,
    }),

  closeModal: () =>
    set({
      activeModal: null,
      modalProps: {},
    }),

  // Reset
  reset: () => set(initialState),
}));

// ============================================
// SELECTORS
// ============================================

export const selectIsLoading = (state: UIState) => state.isGlobalLoading;
export const selectLoadingMessage = (state: UIState) => state.loadingMessage;
export const selectToasts = (state: UIState) => state.toasts;
export const selectActiveModal = (state: UIState) => state.activeModal;
export const selectModalProps = (state: UIState) => state.modalProps;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Show a success toast
 */
export const showSuccessToast = (message: string, duration?: number) => {
  useUIStore.getState().addToast({ type: 'success', message, duration });
};

/**
 * Show an error toast
 */
export const showErrorToast = (message: string, duration?: number) => {
  useUIStore.getState().addToast({ type: 'error', message, duration });
};

/**
 * Show an info toast
 */
export const showInfoToast = (message: string, duration?: number) => {
  useUIStore.getState().addToast({ type: 'info', message, duration });
};

/**
 * Show a warning toast
 */
export const showWarningToast = (message: string, duration?: number) => {
  useUIStore.getState().addToast({ type: 'warning', message, duration });
};
