'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export type FlagReason = 'incorrect_answer' | 'unclear_question' | 'wrong_grade' | 'wrong_subject' | 'typo' | 'other';

export interface FlagSubmission {
  questionId: string;
  curriculumId?: string;
  flagReason: FlagReason;
  userComment?: string;
}

export function useFlags() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  const submitFlag = useCallback(async (data: FlagSubmission): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);
    try {
      await api.post(ENDPOINTS.FLAGS, data);
      setFlaggedQuestions(prev => new Set(prev).add(data.questionId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to submit flag' };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const hasFlagged = useCallback((questionId: string) => {
    return flaggedQuestions.has(questionId);
  }, [flaggedQuestions]);

  return { submitFlag, isSubmitting, hasFlagged };
}
