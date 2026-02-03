'use client';

import Link from 'next/link';
import { UserMenu } from '@/components/auth';

export function Header() {
  return (
    <header className="app-header">
      <div className="header-content">
        <Link href="/" className="app-logo">
          <div className="app-logo-icon">S</div>
          <span className="app-title">
            Cool <span className="title-highlight">S</span>-Cool
          </span>
        </Link>

        <nav className="header-actions">
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
