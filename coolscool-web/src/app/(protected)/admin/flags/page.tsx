'use client';

import { useSession } from 'next-auth/react';
import { useAdminFlags, type FlagStatusFilter } from '@/hooks/use-admin-flags';

const STATUS_FILTERS: { value: FlagStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'dismissed', label: 'Dismissed' },
];

const REASON_COLORS: Record<string, string> = {
  incorrect_answer: 'bg-red-500/20 text-red-400',
  unclear_question: 'bg-yellow-500/20 text-yellow-400',
  wrong_grade: 'bg-orange-500/20 text-orange-400',
  wrong_subject: 'bg-purple-500/20 text-purple-400',
  typo: 'bg-blue-500/20 text-blue-400',
  other: 'bg-gray-500/20 text-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-500/20 text-amber-400',
  reviewed: 'bg-blue-500/20 text-blue-400',
  fixed: 'bg-green-500/20 text-green-400',
  dismissed: 'bg-gray-500/20 text-gray-400',
};

function formatReason(reason: string): string {
  return reason.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminFlagsPage() {
  const { data: session } = useSession();
  const {
    flags,
    stats,
    total,
    isLoading,
    error,
    statusFilter,
    changeFilter,
    updateFlag,
  } = useAdminFlags();

  if (session?.user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Access denied.</p>
      </div>
    );
  }

  const handleAction = async (flagId: string, status: string) => {
    let adminNotes: string | undefined;
    if (status === 'dismissed') {
      adminNotes = prompt('Admin notes (optional):') ?? undefined;
    }
    await updateFlag(flagId, status, adminNotes);
  };

  const openCount = stats?.byStatus['open'] || 0;
  const resolvedCount = (stats?.byStatus['fixed'] || 0) + (stats?.byStatus['dismissed'] || 0);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
          Flagged Questions
        </h1>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-muted)]">Total Flags</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.total}</p>
            </div>
            <div className="bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-muted)]">Open</p>
              <p className="text-2xl font-bold text-amber-400">{openCount}</p>
            </div>
            <div className="bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-muted)]">Resolved</p>
              <p className="text-2xl font-bold text-green-400">{resolvedCount}</p>
            </div>
            <div className="bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-muted)]">Resolution Rate</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.resolutionRate}%</p>
            </div>
          </div>
        )}

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => changeFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-border)] animate-pulse h-32"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && flags.length === 0 && (
          <div className="bg-[var(--color-bg-card)] rounded-lg p-12 border border-[var(--color-border)] text-center">
            <p className="text-[var(--color-text-muted)] text-lg">
              {statusFilter === 'all' ? 'No flags reported yet.' : `No ${statusFilter} flags.`}
            </p>
          </div>
        )}

        {/* Flag list */}
        {!isLoading && !error && flags.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              Showing {flags.length} of {total} flags
            </p>
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-border)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${REASON_COLORS[flag.flagReason] || REASON_COLORS.other}`}>
                        {formatReason(flag.flagReason)}
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[flag.status] || STATUS_COLORS.open}`}>
                        {flag.status}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] font-mono">
                        Q: {flag.questionId.slice(0, 12)}...
                      </span>
                    </div>

                    {/* Comment */}
                    {flag.userComment && (
                      <p className="text-sm text-[var(--color-text-primary)] mb-2">
                        &ldquo;{flag.userComment}&rdquo;
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
                      <span>{flag.displayName || flag.email}</span>
                      <span>{formatDate(flag.createdAt)}</span>
                    </div>

                    {/* Admin notes */}
                    {flag.adminNotes && (
                      <p className="mt-2 text-xs text-[var(--color-text-muted)] italic">
                        Admin: {flag.adminNotes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {(flag.status === 'open' || flag.status === 'reviewed') && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleAction(flag.id, 'fixed')}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                      >
                        Mark Fixed
                      </button>
                      <button
                        onClick={() => handleAction(flag.id, 'dismissed')}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
