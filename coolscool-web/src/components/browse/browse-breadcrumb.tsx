import Link from 'next/link';
import { getBoardById, getSubjectById, formatClassLevel } from '@/lib/curriculum/config';

export interface BrowseBreadcrumbProps {
  board?: string;
  classLevel?: number;
  subject?: string;
}

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

/**
 * BrowseBreadcrumb - Navigation breadcrumb for browse pages
 * Shows: Home > Board > Class > Subject
 * Each segment is a link except the current one
 * Server component - no client-side interactivity needed
 */
export function BrowseBreadcrumb({ board, classLevel, subject }: BrowseBreadcrumbProps) {
  const segments: BreadcrumbSegment[] = [];

  // Home/Browse is always first
  segments.push({
    label: 'Browse',
    href: '/browse',
  });

  // Board segment
  if (board) {
    const boardData = getBoardById(board);
    if (boardData) {
      segments.push({
        label: boardData.name,
        href: classLevel ? `/browse/${board}` : undefined,
      });
    }
  }

  // Class segment
  if (board && classLevel) {
    segments.push({
      label: formatClassLevel(classLevel),
      href: subject ? `/browse/${board}/class-${classLevel}` : undefined,
    });
  }

  // Subject segment
  if (subject) {
    const subjectData = getSubjectById(subject);
    if (subjectData) {
      segments.push({
        label: subjectData.name,
        // Subject is always the current page, no href
      });
    }
  }

  // If only browse, don't show breadcrumb
  if (segments.length === 1) {
    return null;
  }

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb" role="list">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const showSeparator = index > 0;

          return (
            <li key={index} className="breadcrumb-item">
              {showSeparator && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  /
                </span>
              )}
              {segment.href && !isLast ? (
                <Link href={segment.href} className="breadcrumb-link">
                  {segment.label}
                </Link>
              ) : (
                <span
                  className="breadcrumb-current"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {segment.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
