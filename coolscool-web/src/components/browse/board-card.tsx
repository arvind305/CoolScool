import Link from 'next/link';

export interface BoardCardProps {
  boardId: string;
  name: string;
  fullName: string;
  href: string;
  description?: string;
}

/**
 * BoardCard - Displays a board option (ICSE, CBSE, Karnataka State, etc.)
 * Server component - no client-side interactivity needed
 */
export function BoardCard({ name, fullName, href, description }: BoardCardProps) {
  return (
    <Link
      href={href}
      className="card card-interactive browse-card"
      aria-label={`Select ${fullName}`}
    >
      <div className="browse-card-title">{name}</div>
      <div className="browse-card-subtitle">{fullName}</div>
      {description && (
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">
          {description}
        </p>
      )}
    </Link>
  );
}
