'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import type { UserRole } from '@/types/auth';

const roleLabels: Record<UserRole, string> = {
  child: 'Student',
  parent: 'Parent',
  admin: 'Admin',
};

const roleColors: Record<UserRole, string> = {
  child: 'bg-blue-500/20 text-blue-400',
  parent: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-amber-500/20 text-amber-400',
};

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (status === 'loading') {
    return (
      <div className="w-8 h-8 rounded-full bg-[var(--color-bg-secondary)] animate-pulse" />
    );
  }

  if (!session?.user) {
    return (
      <Link href="/login" className="btn btn-ghost-light">
        Sign In
      </Link>
    );
  }

  const { user } = session;
  const initials = user.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  const dashboardUrl = user.role === 'parent' ? '/parent' : '/dashboard';

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName || 'User avatar'}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-medium">
            {initials}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[var(--color-bg-card)] rounded-lg shadow-lg border border-[var(--color-border)] py-2 z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-medium">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--color-text-primary)] truncate">
                  {user.displayName || 'User'}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role]}`}
              >
                {roleLabels[user.role]}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href={dashboardUrl}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              {user.role === 'parent' ? 'Parent Dashboard' : 'My Dashboard'}
            </Link>
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              My Profile
            </Link>
            <Link
              href="/browse"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              Browse Topics
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              Settings
            </Link>
          </div>

          {/* Sign out */}
          <div className="border-t border-[var(--color-border)] pt-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-[var(--color-incorrect)] hover:bg-[var(--color-incorrect-bg)] transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
