'use client';

import { Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get('callbackUrl') || '/browse';
  const errorParam = searchParams.get('error');

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push(callbackUrl);
    }
  }, [status, session, router, callbackUrl]);

  // Handle error from URL params
  useEffect(() => {
    if (errorParam) {
      switch (errorParam) {
        case 'OAuthSignin':
        case 'OAuthCallback':
          setError('There was a problem signing in with Google. Please try again.');
          break;
        case 'OAuthCreateAccount':
          setError('Could not create your account. Please try again.');
          break;
        case 'AccessDenied':
          setError('Access was denied. Please try again.');
          break;
        case 'SessionExpired':
          setError('Your session has expired. Please sign in again.');
          break;
        default:
          setError('An error occurred during sign in. Please try again.');
      }
    }
  }, [errorParam]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signIn('google', {
        callbackUrl,
      });
    } catch {
      setError('Failed to initiate sign in. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-[var(--color-text-secondary)]">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-2xl mb-2">Sign In</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Sign in to save your progress and access all practice content
        </p>

        {error && (
          <div className="mb-6 p-4 bg-[var(--color-incorrect-bg)] border border-[var(--color-incorrect)] rounded-lg text-[var(--color-incorrect)] text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="btn btn-secondary btn-block flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-muted)]">
            Want to try first?{' '}
            <Link href="/browse" className="text-[var(--color-primary)] hover:underline">
              Browse topics
            </Link>{' '}
            without signing in.
          </p>
        </div>

        <div className="mt-6 text-xs text-[var(--color-text-muted)]">
          <p>
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="card max-w-md w-full text-center">
        <div className="text-[var(--color-text-secondary)]">Loading...</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
