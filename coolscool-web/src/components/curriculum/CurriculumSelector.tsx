'use client';

import { useCurriculum } from '@/contexts/CurriculumContext';

interface CurriculumSelectorProps {
  /** Additional class names */
  className?: string;
  /** Show loading skeleton */
  showLoading?: boolean;
  /** Compact mode (no label) */
  compact?: boolean;
  /** On change callback */
  onChange?: (curriculumId: string) => void;
}

/**
 * CurriculumSelector - Dropdown to select the active curriculum
 *
 * Shows available curricula (board + class + subject combinations)
 * and allows users to switch between them.
 */
export function CurriculumSelector({
  className = '',
  showLoading = true,
  compact = false,
  onChange,
}: CurriculumSelectorProps) {
  const {
    curricula,
    currentCurriculum,
    setCurrentCurriculum,
    isLoading,
    error,
  } = useCurriculum();

  // Loading state
  if (isLoading && showLoading) {
    return (
      <div className={`curriculum-selector-loading ${className}`}>
        <div className="animate-pulse bg-[var(--color-surface-elevated)] h-10 w-48 rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`curriculum-selector-error ${className}`}>
        <span className="text-sm text-[var(--color-text-muted)]">
          Unable to load curricula
        </span>
      </div>
    );
  }

  // No curricula available
  if (curricula.length === 0) {
    return null;
  }

  // Single curriculum - show as label only
  if (curricula.length === 1 && currentCurriculum) {
    return (
      <div className={`curriculum-selector-single ${className}`}>
        <span className="curriculum-badge">
          {currentCurriculum.displayName}
        </span>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const curriculumId = e.target.value;
    setCurrentCurriculum(curriculumId);
    onChange?.(curriculumId);
  };

  return (
    <div className={`curriculum-selector ${className}`}>
      {!compact && (
        <label
          htmlFor="curriculum-select"
          className="curriculum-selector-label"
        >
          Curriculum
        </label>
      )}
      <select
        id="curriculum-select"
        value={currentCurriculum?.id || ''}
        onChange={handleChange}
        className="curriculum-selector-select"
        aria-label="Select curriculum"
      >
        {curricula.map((curriculum) => (
          <option key={curriculum.id} value={curriculum.id}>
            {curriculum.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CurriculumSelector;
