import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BOARDS,
  CLASSES,
  SUBJECTS,
  getBoardById,
  getSubjectById,
  parseClassLevel,
  formatClassLevel,
  classLevelToSlug,
} from '@/lib/curriculum/config';
import { TopicBrowser } from '@/components/topics';

type Props = {
  params: Promise<{ board: string; classLevel: string; subject: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { board: boardId, classLevel: classSlug, subject: subjectId } = await params;
  const board = getBoardById(boardId);
  const classLevel = parseClassLevel(classSlug);
  const subject = getSubjectById(subjectId);

  if (!board || !classLevel || !subject) return { title: 'Not Found' };

  return {
    title: `${subject.name} Topics - ${board.name} ${formatClassLevel(classLevel)} | Cool S-Cool`,
    description: `Practice ${subject.name} topics for ${board.name} ${formatClassLevel(classLevel)}`,
  };
}

export function generateStaticParams() {
  const params: { board: string; classLevel: string; subject: string }[] = [];
  Object.keys(BOARDS).forEach((board) => {
    CLASSES.forEach((level) => {
      Object.keys(SUBJECTS).forEach((subject) => {
        params.push({
          board,
          classLevel: classLevelToSlug(level),
          subject,
        });
      });
    });
  });
  return params;
}

export default async function SubjectPage({ params }: Props) {
  const { board: boardId, classLevel: classSlug, subject: subjectId } = await params;
  const board = getBoardById(boardId);
  const classLevel = parseClassLevel(classSlug);
  const subject = getSubjectById(subjectId);

  if (!board || !classLevel || !subject) {
    notFound();
  }

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto page-enter">
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/browse" className="breadcrumb-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Browse
        </Link>
        <span className="breadcrumb-sep">/</span>
        <Link href={`/browse/${boardId}`} className="breadcrumb-link">
          {board.name}
        </Link>
        <span className="breadcrumb-sep">/</span>
        <Link href={`/browse/${boardId}/${classSlug}`} className="breadcrumb-link">
          {formatClassLevel(classLevel)}
        </Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{subject.name}</span>
      </nav>

      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: subject.color }}
          >
            {subject.icon}
          </div>
          <div>
            <h1 className="mb-0">{subject.name}</h1>
            <p className="text-[var(--color-text-secondary)]">
              {board.name} {formatClassLevel(classLevel)}
            </p>
          </div>
        </div>
      </header>

      {/* Topic Browser */}
      <TopicBrowser
        board={boardId}
        classLevel={classLevel}
        subject={subjectId}
      />
    </div>
  );
}
