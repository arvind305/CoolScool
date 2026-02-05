import Link from 'next/link';
import { BOARDS } from '@/lib/curriculum/config';

export const metadata = {
  title: 'Browse Boards | Cool S-Cool',
  description: 'Choose your education board to start practicing',
};

export default function BrowsePage() {
  const boards = Object.values(BOARDS);

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="mb-2">Browse Boards</h1>
        <p className="text-[var(--color-text-secondary)]">
          Select your education board to explore classes and subjects
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        {boards.map((board) => {
          const isLive = board.status === 'live';

          if (!isLive) {
            return (
              <div
                key={board.id}
                className="card relative opacity-75 cursor-not-allowed p-4"
              >
                <span className="absolute top-2 right-2 text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-2 py-0.5 rounded">
                  Coming Soon
                </span>
                <h2 className="text-lg mb-1">{board.name}</h2>
                <p className="text-sm text-[var(--color-text-muted)] mb-2">
                  {board.fullName}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {board.description}
                </p>
              </div>
            );
          }

          return (
            <Link
              key={board.id}
              href={`/browse/${board.id}`}
              className="card card-interactive relative p-4"
            >
              <span className="absolute top-2 right-2 text-xs font-medium text-[var(--color-correct)] bg-[var(--color-correct-bg)] px-2 py-0.5 rounded">
                Live
              </span>
              <h2 className="text-lg mb-1">{board.name}</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-2">
                {board.fullName}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {board.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
