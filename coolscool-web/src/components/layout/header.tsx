'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { UserMenu } from '@/components/auth';

export function Header() {
  const { data: session } = useSession();
  const user = session?.user;
  const dashboardUrl = user?.role === 'parent' ? '/parent' : '/dashboard';

  return (
    <header className="app-header">
      <div className="header-content">
        <Link href="/" className="app-logo">
          <div className="app-logo-icon">
            <img src="/mark.svg" alt="CoolScool" width={38} height={38} />
          </div>
          <span className="app-title">
            Cool<span className="title-highlight">S</span>cool
          </span>
        </Link>

        <nav className="header-actions">
          {user && (
            <Link href={dashboardUrl} className="btn btn-ghost-light">
              My Dashboard
            </Link>
          )}
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
