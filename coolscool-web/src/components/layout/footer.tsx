export function Footer() {
  return (
    <footer className="py-6 px-4 border-t border-[var(--color-border)] bg-[var(--color-bg-card)]">
      <div className="max-w-[var(--container-lg)] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-text-muted)]">
        <p>
          {new Date().getFullYear()} Cool S-Cool. Pressure-free learning.
        </p>
        <nav className="flex gap-6">
          <a href="#" className="hover:text-[var(--color-text)] transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-[var(--color-text)] transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-[var(--color-text)] transition-colors">
            Help
          </a>
        </nav>
      </div>
    </footer>
  );
}
