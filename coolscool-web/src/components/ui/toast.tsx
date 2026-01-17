'use client';

import * as React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';

// Types
export interface ToastData {
  id: string;
  message: string;
  type?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
}

export interface ToastOptions {
  type?: ToastData['type'];
  duration?: number;
}

interface ToastState {
  toasts: ToastData[];
}

type ToastAction =
  | { type: 'ADD_TOAST'; payload: ToastData }
  | { type: 'REMOVE_TOAST'; payload: string };

// Reducer
function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.payload),
      };
    default:
      return state;
  }
}

// Context
interface ToastContextValue {
  toasts: ToastData[];
  addToast: (message: string, options?: ToastOptions) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Provider
export interface ToastProviderProps {
  children: React.ReactNode;
  defaultDuration?: number;
}

export function ToastProvider({
  children,
  defaultDuration = 4000,
}: ToastProviderProps) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });
  const toastIdCounter = useRef(0);

  const addToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = `toast-${++toastIdCounter.current}`;
      const toast: ToastData = {
        id,
        message,
        type: options.type || 'default',
        duration: options.duration ?? defaultDuration,
      };

      dispatch({ type: 'ADD_TOAST', payload: toast });
      return id;
    },
    [defaultDuration]
  );

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts: state.toasts, addToast, removeToast }}
    >
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

// Hook
export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { addToast, removeToast } = context;

  return {
    toast: (message: string, options?: ToastOptions) =>
      addToast(message, options),
    success: (message: string, options?: Omit<ToastOptions, 'type'>) =>
      addToast(message, { ...options, type: 'success' }),
    error: (message: string, options?: Omit<ToastOptions, 'type'>) =>
      addToast(message, { ...options, type: 'error' }),
    warning: (message: string, options?: Omit<ToastOptions, 'type'>) =>
      addToast(message, { ...options, type: 'warning' }),
    dismiss: removeToast,
  };
}

// Toast Container Component
function ToastContainer() {
  const context = useContext(ToastContext);

  if (!context) return null;

  const { toasts } = context;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
}

// Individual Toast Component
interface ToastProps extends ToastData {}

function Toast({ id, message, type = 'default', duration = 4000 }: ToastProps) {
  const context = useContext(ToastContext);
  const [isExiting, setIsExiting] = React.useState(false);

  useEffect(() => {
    if (duration <= 0) return;

    const dismissTimeout = setTimeout(() => {
      setIsExiting(true);
    }, duration - 200);

    const removeTimeout = setTimeout(() => {
      context?.removeToast(id);
    }, duration);

    return () => {
      clearTimeout(dismissTimeout);
      clearTimeout(removeTimeout);
    };
  }, [id, duration, context]);

  const typeStyles: Record<string, React.CSSProperties> = {
    default: {},
    success: {
      background: 'var(--color-correct)',
    },
    error: {
      background: 'var(--color-incorrect)',
    },
    warning: {
      background: 'var(--color-accent)',
    },
  };

  const exitStyle: React.CSSProperties = isExiting
    ? {
        opacity: 0,
        transform: 'translateY(16px)',
        transition: 'all var(--transition-fast)',
      }
    : {};

  return (
    <div
      className="toast"
      role="alert"
      style={{ ...typeStyles[type], ...exitStyle }}
    >
      {message}
    </div>
  );
}

export { ToastContainer };
