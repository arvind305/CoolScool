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
        <nav className="mb-6 text-sm">
          <Link href="/browse" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            Browse
          </Link>
          <span className="mx-2 text-[var(--color-text-muted)]">/</span>
          <span className="text-[var(--color-text)]">{board.name}</span>
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
    <div className="px-4 py-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link href="/browse" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          Browse
        </Link>
        <span className="mx-2 text-[var(--color-text-muted)]">/</span>
        <span className="text-[var(--color-text)]">{board.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="mb-2">{board.name} - {board.fullName}</h1>
        <p className="font-semibold text-[var(--color-text-secondary)]">
          Select a class to view subjects
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {CLASSES.map((classLevel) => (
          <Link
            key={classLevel}
            href={`/browse/${boardId}/${classLevelToSlug(classLevel)}`}
            className="card card-interactive text-center py-6"
          >
            <span className="text-lg font-bold text-[var(--color-primary)]">
              Grade {classLevel}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
