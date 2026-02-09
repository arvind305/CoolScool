'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ProfileForm } from '@/components/profile/profile-form';
import { getProfile } from '@/services/profile-api';
import type { ProfileData } from '@/services/profile-api';

export default function ProfilePage() {
  const { data: session } = useSession();
  const { accessToken } = useAuthToken();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    async function fetchProfile() {
      try {
        const res = await getProfile(accessToken!);
        if (!cancelled) {
          setProfile(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load profile'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <main className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <header className="profile-header">
          <Link href="/dashboard" className="profile-back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="profile-title">My Profile</h1>
        </header>

        {/* Loading State */}
        {isLoading && (
          <div className="profile-loading">
            <span
              className="loading-spinner"
              style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}
              aria-hidden="true"
            />
            <p>Loading profile...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="profile-section">
            <div className="profile-message profile-message-error">
              {error}
            </div>
          </div>
        )}

        {/* Profile Form */}
        {!isLoading && !error && profile && accessToken && (
          <ProfileForm profile={profile} accessToken={accessToken} />
        )}
      </div>
    </main>
  );
}
