import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <h1 className="landing-hero-title">
          Master Your Curriculum,{' '}
          <span className="text-[var(--color-primary)]">Pressure-Free</span>
        </h1>
        <p className="landing-hero-subtitle">
          Adaptive practice for ICSE, CBSE, and State Board students.
          Build genuine understanding with personalized quizzes that match your pace.
        </p>
        <div className="landing-hero-cta">
          <Link href="/browse" className="btn btn-primary btn-lg landing-cta-primary">
            Start Learning
          </Link>
          <Link href="/browse" className="btn btn-secondary btn-lg">
            Browse Subjects
          </Link>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="stats-banner">
        <div className="stats-banner-inner">
          <div className="stats-banner-item">
            <span className="stats-banner-number">5,000+</span>
            <span className="stats-banner-label">Questions</span>
          </div>
          <div className="stats-banner-divider" />
          <div className="stats-banner-item">
            <span className="stats-banner-number">3</span>
            <span className="stats-banner-label">Subjects</span>
          </div>
          <div className="stats-banner-divider" />
          <div className="stats-banner-item">
            <span className="stats-banner-number">12</span>
            <span className="stats-banner-label">Classes</span>
          </div>
          <div className="stats-banner-divider" />
          <div className="stats-banner-item">
            <span className="stats-banner-number">2</span>
            <span className="stats-banner-label">Boards</span>
          </div>
        </div>
        {/* TODO: Fetch live stats from /api/v1/curricula/overview */}
      </section>

      {/* Feature Highlights */}
      <section className="landing-features">
        <h2 className="landing-section-title">Why Cool S-Cool?</h2>
        <div className="feature-cards-grid">
          <div className="feature-card">
            <div className="feature-card-icon" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93" />
                <path d="M8.56 6.22A4 4 0 0 1 12 2" />
                <path d="M12 18v4" />
                <path d="M8 22h8" />
                <path d="M7 12h10" />
                <path d="M9 16h6" />
                <path d="M5 8l2 4" />
                <path d="M19 8l-2 4" />
              </svg>
            </div>
            <h3 className="feature-card-title">Adaptive Learning</h3>
            <p className="feature-card-desc">
              Questions adapt to your skill level. Start easy, progress at your own pace, and master concepts step by step.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-card-icon" style={{ background: 'rgba(20, 184, 166, 0.1)', color: 'var(--color-secondary)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
                <line x1="2" y1="20" x2="22" y2="20" />
              </svg>
            </div>
            <h3 className="feature-card-title">Progress Tracking</h3>
            <p className="feature-card-desc">
              Detailed analytics show your strengths and areas to improve. Watch your proficiency grow over time.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-card-icon" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="feature-card-title">Parent Dashboard</h3>
            <p className="feature-card-desc">
              Parents can monitor their child&apos;s learning journey, track activity, and celebrate achievements together.
            </p>
          </div>
        </div>
      </section>

      {/* Board Selection */}
      <section className="landing-boards">
        <h2 className="landing-section-title">Choose Your Board</h2>
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

      {/* Trust Section */}
      <section className="landing-trust">
        <div className="landing-trust-inner">
          <div className="landing-trust-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-correct)" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Curriculum-aligned content</span>
          </div>
          <div className="landing-trust-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-correct)" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Free to start, no payment needed</span>
          </div>
          <div className="landing-trust-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-correct)" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Built for Indian students, Classes 1-12</span>
          </div>
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
