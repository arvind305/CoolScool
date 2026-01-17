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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.map((board) => (
          <Link
            key={board.id}
            href={`/browse/${board.id}`}
            className="card card-interactive"
          >
            <h2 className="text-xl mb-1">{board.name}</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-2">
              {board.fullName}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {board.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
