import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BOARDS, CLASSES, getBoardById, classLevelToSlug, formatClassLevel } from '@/lib/curriculum/config';

type Props = {
  params: Promise<{ board: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { board: boardId } = await params;
  const board = getBoardById(boardId);
  if (!board) return { title: 'Board Not Found' };

  return {
    title: `${board.name} Classes | Cool S-Cool`,
    description: `Browse classes for ${board.fullName}`,
  };
}

export function generateStaticParams() {
  return Object.keys(BOARDS).map((board) => ({ board }));
}

export default async function BoardPage({ params }: Props) {
  const { board: boardId } = await params;
  const board = getBoardById(boardId);

  if (!board) {
    notFound();
  }

  // Show coming soon message for non-live boards
  if (board.status !== 'live') {
    return (
      <div className="px-4 py-8 max-w-4xl mx-auto">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/browse" className="breadcrumb-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Browse
          </Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{board.name}</span>
        </nav>

        <div className="text-center py-16">
          <h1 className="mb-4">{board.name}</h1>
          <p className="text-[var(--color-text-secondary)] mb-6">
            {board.fullName}
          </p>
          <span className="inline-block text-sm font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-4 py-2 rounded-lg">
            Coming Soon
          </span>
          <p className="text-sm text-[var(--color-text-muted)] mt-6">
            We&apos;re working on adding content for this board. Check back soon!
          </p>
          <Link href="/browse" className="btn btn-primary mt-8">
            Browse Other Boards
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto page-enter">
      <header className="mb-8">
        <h1 className="mb-2">{board.name}</h1>
        <p className="font-semibold text-[var(--color-text-secondary)]">
          Select a class to view subjects
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {CLASSES.map((classLevel) => (
          <Link
            key={classLevel}
            href={`/browse/${boardId}/${classLevelToSlug(classLevel)}`}
            className="card card-interactive text-center py-5 sm:py-6"
          >
            <span className="text-base sm:text-lg font-bold text-[var(--color-primary)]">
              Grade {classLevel}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
