/**
 * Context Store
 *
 * Zustand store for curriculum context (board, class, subject).
 * Persisted to localStorage for cross-session continuity.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// STATE INTERFACE
// ============================================

interface ContextState {
  // Curriculum context
  board: string;
  classLevel: number;
  subject: string;

  // Selected topic (for quiz)
  topicId: string | null;
  topicName: string | null;
  themeName: string | null;
}

// ============================================
// ACTIONS INTERFACE
// ============================================

interface ContextActions {
  setContext: (context: Partial<Pick<ContextState, 'board' | 'classLevel' | 'subject'>>) => void;
  setTopic: (topicId: string, topicName: string, themeName: string) => void;
  clearTopic: () => void;
  reset: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: ContextState = {
  board: 'icse',
  classLevel: 5,
  subject: 'mathematics',
  topicId: null,
  topicName: null,
  themeName: null,
};

// ============================================
// STORE
// ============================================

export const useContextStore = create<ContextState & ContextActions>()(
  persist(
    (set) => ({
      ...initialState,

      setContext: (context) =>
        set((state) => ({
          ...state,
          ...context,
          // Clear topic when context changes
          topicId: null,
          topicName: null,
          themeName: null,
        })),

      setTopic: (topicId, topicName, themeName) =>
        set({
          topicId,
          topicName,
          themeName,
        }),

      clearTopic: () =>
        set({
          topicId: null,
          topicName: null,
          themeName: null,
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'coolscool-context',
      storage: createJSONStorage(() => {
        // Check if we're in the browser
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // Return a no-op storage for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        board: state.board,
        classLevel: state.classLevel,
        subject: state.subject,
      }),
    }
  )
);

// ============================================
// SELECTORS
// ============================================

export const selectContext = (state: ContextState) => ({
  board: state.board,
  classLevel: state.classLevel,
  subject: state.subject,
});

export const selectTopic = (state: ContextState) => ({
  topicId: state.topicId,
  topicName: state.topicName,
  themeName: state.themeName,
});

export const selectHasTopic = (state: ContextState) => state.topicId !== null;
