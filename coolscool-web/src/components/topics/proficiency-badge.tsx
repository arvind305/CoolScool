'use client';

import { ProficiencyBand } from '@/lib/quiz-engine/types';

export interface ProficiencyBadgeProps {
  band: ProficiencyBand;
  label: string;
  size?: 'sm' | 'md';
}

/**
 * ProficiencyBadge - Displays proficiency level as a colored badge
 *
 * Bands: not_started, building_familiarity, growing_confidence,
 *        consistent_understanding, exam_ready
 */
export function ProficiencyBadge({ band, label, size = 'md' }: ProficiencyBadgeProps) {
  // Convert snake_case to kebab-case for CSS class
  const bandClass = band.replace(/_/g, '-');

  return (
    <span
      className={`proficiency-badge ${bandClass} ${size === 'sm' ? 'proficiency-badge-sm' : ''}`}
      role="status"
      aria-label={`Proficiency level: ${label}`}
    >
      {label}
    </span>
  );
}

export default ProficiencyBadge;
