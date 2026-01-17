import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 md:py-24">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="mb-6">
          Master Your Curriculum,{' '}
          <span className="text-[var(--color-primary)]">Pressure-Free</span>
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)] mb-8 max-w-2xl mx-auto">
          Adaptive practice for ICSE, CBSE, and State Board students.
          Build genuine understanding with personalized quizzes that match your pace.
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

      {/* Features Section */}
      <section className="w-full max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon="+"
            title="Multi-Board Support"
            description="ICSE, CBSE, Karnataka State Board and more. Content aligned to your curriculum."
          />
          <FeatureCard
            icon="*"
            title="Adaptive Learning"
            description="Questions adapt to your level. Build confidence through gradual progression."
          />
          <FeatureCard
            icon=">"
            title="Track Progress"
            description="See your growth across topics. Know exactly where you stand."
          />
        </div>
      </section>

      {/* Board Selection Preview */}
      <section className="w-full max-w-4xl mx-auto mt-16">
        <h2 className="text-center mb-8">Choose Your Board</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <BoardCard
            board="icse"
            name="ICSE"
            fullName="Indian Certificate of Secondary Education"
          />
          <BoardCard
            board="cbse"
            name="CBSE"
            fullName="Central Board of Secondary Education"
          />
          <BoardCard
            board="karnataka"
            name="Karnataka"
            fullName="Karnataka State Board"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-primary)] text-2xl font-bold">
        {icon}
      </div>
      <h3 className="text-lg mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
    </div>
  );
}

function BoardCard({
  board,
  name,
  fullName,
}: {
  board: string;
  name: string;
  fullName: string;
}) {
  return (
    <Link href={`/browse/${board}`} className="card card-interactive">
      <h3 className="text-lg mb-1">{name}</h3>
      <p className="text-sm text-[var(--color-text-muted)]">{fullName}</p>
    </Link>
  );
}
