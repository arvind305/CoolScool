import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 md:py-12">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="mb-6">
          Master Your Curriculum,{' '}
          <span className="text-[var(--color-primary)]">Pressure-Free</span>
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)] mb-4 max-w-2xl mx-auto">
          Adaptive practice for ICSE, CBSE, and State Board students.
          Build genuine understanding with personalized quizzes that match your pace.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mb-8 max-w-2xl mx-auto">
          <span className="font-medium text-[var(--color-primary)]">Multi-Board Support</span> &bull; <span className="font-medium text-[var(--color-secondary)]">Adaptive Learning</span> &bull; <span className="font-medium text-[var(--color-accent)]">Track Progress</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/browse" className="btn btn-primary btn-lg">
            Start Practicing
          </Link>
          <Link href="/login" className="btn btn-secondary btn-lg">
            Sign In
          </Link>
        </div>
      </section>

      {/* Board Selection Preview */}
      <section className="w-full max-w-4xl mx-auto mt-16">
        <h2 className="text-center mb-8">Choose Your Board</h2>
        <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          <BoardCard
            board="icse"
            name="ICSE"
            fullName="Indian Certificate of Secondary Education"
            status="live"
          />
          <BoardCard
            board="cbse"
            name="CBSE"
            fullName="Central Board of Secondary Education"
            status="coming_soon"
          />
        </div>
      </section>
    </div>
  );
}


function BoardCard({
  board,
  name,
  fullName,
  status,
}: {
  board: string;
  name: string;
  fullName: string;
  status: 'live' | 'coming_soon';
}) {
  const isLive = status === 'live';

  if (!isLive) {
    return (
      <div className="card relative opacity-75 cursor-not-allowed p-4">
        <span className="absolute top-2 right-2 text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-2 py-0.5 rounded">
          Coming Soon
        </span>
        <h3 className="text-base mb-1">{name}</h3>
        <p className="text-xs text-[var(--color-text-muted)]">{fullName}</p>
      </div>
    );
  }

  return (
    <Link href={`/browse/${board}`} className="card card-interactive relative p-4">
      <span className="absolute top-2 right-2 text-xs font-medium text-[var(--color-correct)] bg-[var(--color-correct-bg)] px-2 py-0.5 rounded">
        Live
      </span>
      <h3 className="text-base mb-1">{name}</h3>
      <p className="text-xs text-[var(--color-text-muted)]">{fullName}</p>
    </Link>
  );
}
