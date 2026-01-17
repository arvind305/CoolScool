import Link from 'next/link';
import { formatClassLevel } from '@/lib/curriculum/config';

export interface ClassCardProps {
  classLevel: number;
  boardId: string;
  href: string;
}

/**
 * ClassCard - Displays a class level option (Class 1, Class 2, etc.)
 * Server component - no client-side interactivity needed
 */
export function ClassCard({ classLevel, href }: ClassCardProps) {
  return (
    <Link
      href={href}
      className="card card-interactive browse-card"
      aria-label={`Select ${formatClassLevel(classLevel)}`}
    >
      <div className="browse-card-icon text-[var(--color-primary)]" aria-hidden="true">
        {classLevel}
      </div>
      <div className="browse-card-subtitle">
        {formatClassLevel(classLevel)}
      </div>
    </Link>
  );
}
