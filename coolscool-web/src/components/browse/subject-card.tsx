import Link from 'next/link';

export interface SubjectCardProps {
  subjectId: string;
  name: string;
  icon: string;
  href: string;
  color?: string;
}

/**
 * SubjectCard - Displays a subject option (Mathematics, Science, etc.)
 * Server component - no client-side interactivity needed
 */
export function SubjectCard({ name, icon, href, color }: SubjectCardProps) {
  return (
    <Link
      href={href}
      className="card card-interactive browse-card"
      aria-label={`Select ${name}`}
    >
      <div
        className="browse-card-icon-wrapper"
        style={{ backgroundColor: color || 'var(--color-primary)' }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="browse-card-title">{name}</div>
      <div className="browse-card-subtitle">Browse topics</div>
    </Link>
  );
}
