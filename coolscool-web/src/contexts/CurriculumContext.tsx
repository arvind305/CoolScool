'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

// ============================================
// Types
// ============================================

export interface Curriculum {
  id: string;
  board: string;
  classLevel: number;
  subject: string;
  displayName: string;
  academicYear: string | null;
  camVersion: string;
  isActive: boolean;
  counts?: {
    themes: number;
    topics: number;
    concepts: number;
    questions: number;
  };
}

interface CurriculumContextType {
  /** List of all available curricula */
  curricula: Curriculum[];
  /** Currently selected curriculum */
  currentCurriculum: Curriculum | null;
  /** Set the current curriculum by ID or object */
  setCurrentCurriculum: (curriculum: Curriculum | string) => void;
  /** Find curriculum by board/class/subject */
  findCurriculum: (board: string, classLevel: number, subject: string) => Curriculum | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error message if failed to load */
  error: string | null;
  /** Refresh the curricula list */
  refresh: () => Promise<void>;
}

// ============================================
// Context
// ============================================

const CurriculumContext = createContext<CurriculumContextType | undefined>(undefined);

// Storage key for persisting curriculum selection
const STORAGE_KEY = 'coolscool_selected_curriculum';

// ============================================
// Provider
// ============================================

interface CurriculumProviderProps {
  children: ReactNode;
}

export function CurriculumProvider({ children }: CurriculumProviderProps) {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [currentCurriculum, setCurrentCurriculumState] = useState<Curriculum | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load curricula from API
  const loadCurricula = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://coolscool.onrender.com';
      const response = await fetch(`${apiUrl}/api/v1/curricula/overview`);

      if (!response.ok) {
        throw new Error(`Failed to fetch curricula: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.data?.curricula) {
        throw new Error('Invalid response format');
      }

      const loadedCurricula: Curriculum[] = data.data.curricula;
      setCurricula(loadedCurricula);

      // Restore previously selected curriculum from storage
      if (loadedCurricula.length > 0) {
        let selectedCurriculum: Curriculum | undefined;

        // Try to restore from localStorage
        if (typeof window !== 'undefined') {
          const storedId = localStorage.getItem(STORAGE_KEY);
          if (storedId) {
            selectedCurriculum = loadedCurricula.find(c => c.id === storedId);
          }
        }

        // Default to first curriculum if no stored preference
        if (!selectedCurriculum) {
          selectedCurriculum = loadedCurricula[0];
        }

        setCurrentCurriculumState(selectedCurriculum);
      }
    } catch (err) {
      console.error('Failed to load curricula:', err);
      setError(err instanceof Error ? err.message : 'Failed to load curricula');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCurricula();
  }, [loadCurricula]);

  // Set current curriculum (accepts ID or object)
  const setCurrentCurriculum = useCallback((curriculum: Curriculum | string) => {
    let selected: Curriculum | undefined;

    if (typeof curriculum === 'string') {
      selected = curricula.find(c => c.id === curriculum);
    } else {
      selected = curriculum;
    }

    if (selected) {
      setCurrentCurriculumState(selected);
      // Persist selection
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, selected.id);
      }
    }
  }, [curricula]);

  // Find curriculum by board/class/subject
  const findCurriculum = useCallback((board: string, classLevel: number, subject: string) => {
    return curricula.find(
      c =>
        c.board.toLowerCase() === board.toLowerCase() &&
        c.classLevel === classLevel &&
        c.subject.toLowerCase() === subject.toLowerCase()
    );
  }, [curricula]);

  const value: CurriculumContextType = {
    curricula,
    currentCurriculum,
    setCurrentCurriculum,
    findCurriculum,
    isLoading,
    error,
    refresh: loadCurricula,
  };

  return (
    <CurriculumContext.Provider value={value}>
      {children}
    </CurriculumContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useCurriculum() {
  const context = useContext(CurriculumContext);
  if (!context) {
    throw new Error('useCurriculum must be used within a CurriculumProvider');
  }
  return context;
}

// ============================================
// Optional hook that doesn't throw
// ============================================

export function useCurriculumOptional() {
  return useContext(CurriculumContext);
}
