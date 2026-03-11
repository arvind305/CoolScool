'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { DailyChallenge, DailyChallengeResult } from '@/lib/api/types';

export interface DailyChallengeCardProps {
  data: DailyChallenge;
  onSubmit: (answer: string) => Promise<DailyChallengeResult | null>;
  isSubmitting: boolean;
}

export function DailyChallengeCard({ data, onSubmit, isSubmitting }: DailyChallengeCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<DailyChallengeResult | null>(null);
  const alreadyAttempted = data.attempted;

  // No challenge available
  if (!data.challenge) {
    return (
      <div className="daily-challenge-card daily-challenge-empty">
        <div className="daily-challenge-header">
          <span className="daily-challenge-icon">{'\u2728'}</span>
          <h3 className="daily-challenge-title">Daily Challenge</h3>
        </div>
        <p className="daily-challenge-message">No challenge available today. Check back tomorrow!</p>
      </div>
    );
  }

  const { question, bonusXp } = data.challenge;
  const showResult = alreadyAttempted || result !== null;
  const displayResult = result || (data.result ? { isCorrect: data.result.isCorrect, xpEarned: data.result.xpEarned, correctAnswer: '', explanation: null } : null);

  const handleSubmit = async () => {
    if (!selectedAnswer) return;
    const res = await onSubmit(selectedAnswer);
    if (res) setResult(res);
  };

  return (
    <div className={`daily-challenge-card ${showResult ? (displayResult?.isCorrect ? 'daily-challenge-correct' : 'daily-challenge-incorrect') : ''}`}>
      <div className="daily-challenge-header">
        <span className="daily-challenge-icon">{'\u2728'}</span>
        <h3 className="daily-challenge-title">Daily Challenge</h3>
        <span className="daily-challenge-bonus">+{bonusXp} XP</span>
      </div>

      <p className="daily-challenge-question">{question.question_text}</p>

      {/* Options */}
      {question.options && (
        <div className="daily-challenge-options">
          {question.options.map((opt) => {
            const isSelected = selectedAnswer === opt.id;
            const isDisabled = showResult;
            let optionClass = 'daily-challenge-option';
            if (isSelected) optionClass += ' selected';
            if (isDisabled) optionClass += ' disabled';
            if (showResult && result?.correctAnswer === opt.id) optionClass += ' correct';
            if (showResult && isSelected && !displayResult?.isCorrect) optionClass += ' incorrect';

            return (
              <button
                key={opt.id}
                className={optionClass}
                onClick={() => !isDisabled && setSelectedAnswer(opt.id)}
                disabled={isDisabled}
              >
                <span className="daily-challenge-option-id">{opt.id}</span>
                <span className="daily-challenge-option-text">{opt.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Submit / Result */}
      {showResult ? (
        <div className="daily-challenge-result">
          {displayResult?.isCorrect ? (
            <p className="daily-challenge-result-text correct">
              Correct! +{displayResult.xpEarned} XP earned
            </p>
          ) : (
            <p className="daily-challenge-result-text incorrect">
              Not quite. Better luck tomorrow!
            </p>
          )}
          {result?.explanation && (
            <p className="daily-challenge-explanation">{result.explanation}</p>
          )}
        </div>
      ) : (
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!selectedAnswer || isSubmitting}
          className="daily-challenge-submit"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      )}
    </div>
  );
}
