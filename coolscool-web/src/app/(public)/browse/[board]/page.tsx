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
        <h1 className="mb-2">{board.name}</h1>
        <p className="text-[var(--color-text-secondary)]">
          {board.fullName} - Select a class to view subjects
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {CLASSES.map((classLevel) => (
          <Link
            key={classLevel}
            href={`/browse/${boardId}/${classLevelToSlug(classLevel)}`}
            className="card card-interactive text-center py-6"
          >
            <span className="text-2xl font-bold text-[var(--color-primary)]">
              {classLevel}
            </span>
            <span className="block text-sm text-[var(--color-text-secondary)] mt-1">
              {formatClassLevel(classLevel)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
