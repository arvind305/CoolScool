import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BOARDS,
  CLASSES,
  SUBJECTS,
  getBoardById,
  parseClassLevel,
  formatClassLevel,
  classLevelToSlug,
} from '@/lib/curriculum/config';

type Props = {
  params: Promise<{ board: string; classLevel: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { board: boardId, classLevel: classSlug } = await params;
  const board = getBoardById(boardId);
  const classLevel = parseClassLevel(classSlug);

  if (!board || !classLevel) return { title: 'Not Found' };

  return {
    title: `${board.name} ${formatClassLevel(classLevel)} Subjects | Cool S-Cool`,
    description: `Browse subjects for ${board.name} ${formatClassLevel(classLevel)}`,
  };
}

export function generateStaticParams() {
  const params: { board: string; classLevel: string }[] = [];
  Object.keys(BOARDS).forEach((board) => {
    CLASSES.forEach((level) => {
      params.push({ board, classLevel: classLevelToSlug(level) });
    });
  });
  return params;
}

export default async function ClassPage({ params }: Props) {
  const { board: boardId, classLevel: classSlug } = await params;
  const board = getBoardById(boardId);
  const classLevel = parseClassLevel(classSlug);

  if (!board || !classLevel) {
    notFound();
  }

  const subjects = Object.values(SUBJECTS);

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link href="/browse" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          Browse
        </Link>
        <span className="mx-2 text-[var(--color-text-muted)]">/</span>
        <Link href={`/browse/${boardId}`} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          {board.name}
        </Link>
        <span className="mx-2 text-[var(--color-text-muted)]">/</span>
        <span className="text-[var(--color-text)]">{formatClassLevel(classLevel)}</span>
      </nav>

      <header className="mb-8">
        <h1 className="mb-2">
          {board.name} {formatClassLevel(classLevel)}
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Select a subject to start practicing
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {subjects.map((subject) => (
          <Link
            key={subject.id}
            href={`/browse/${boardId}/${classSlug}/${subject.id}`}
            className="card card-interactive flex items-center gap-4"
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: subject.color }}
            >
              {subject.icon}
            </div>
            <div>
              <h2 className="text-lg">{subject.name}</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Browse topics
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
