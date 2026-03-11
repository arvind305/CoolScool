/**
 * Email Service
 *
 * Sends notification emails via Resend.
 * All methods are fire-and-forget — they log errors but never throw.
 */

import { Resend } from 'resend';
import { config } from '../config/index.js';

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (!config.email.resendApiKey) {
    return null;
  }
  if (!resend) {
    resend = new Resend(config.email.resendApiKey);
  }
  return resend;
}

interface FlagNotificationData {
  questionId: string;
  flagReason: string;
  userComment: string | null;
  reporterEmail: string;
  createdAt: string;
}

/**
 * Send an email to the admin when a question is flagged.
 * Silently returns if email is not configured.
 */
export async function sendFlagNotification(data: FlagNotificationData): Promise<void> {
  const client = getClient();
  if (!client || !config.email.adminEmail) {
    console.debug('Email not configured — skipping flag notification');
    return;
  }

  const { questionId, flagReason, userComment, reporterEmail, createdAt } = data;
  const reason = flagReason.replace(/_/g, ' ');

  try {
    await client.emails.send({
      from: 'CoolScool <notifications@coolscool.in>',
      to: config.email.adminEmail,
      subject: `[CoolScool] Question flagged: ${reason} — ${questionId.slice(0, 8)}`,
      text: [
        `A user reported an issue with question ${questionId}:`,
        '',
        `Reason: ${reason}`,
        `Comment: ${userComment || 'No comment'}`,
        `Reported by: ${reporterEmail}`,
        `Time: ${createdAt}`,
        '',
        'Review at: https://www.coolscool.in/admin/flags',
      ].join('\n'),
      html: [
        '<div style="font-family: sans-serif; max-width: 500px;">',
        `<h2 style="color: #1a1a2e;">Question Flagged</h2>`,
        `<p>A user reported an issue with question <strong>${questionId}</strong>:</p>`,
        '<table style="border-collapse: collapse; width: 100%;">',
        `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Reason</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${reason}</strong></td></tr>`,
        `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Comment</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${userComment || '<em>No comment</em>'}</td></tr>`,
        `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Reporter</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${reporterEmail}</td></tr>`,
        `<tr><td style="padding: 8px; color: #666;">Time</td><td style="padding: 8px;">${createdAt}</td></tr>`,
        '</table>',
        '<p style="margin-top: 20px;"><a href="https://www.coolscool.in/admin/flags" style="background: #6c63ff; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Review Flags</a></p>',
        '</div>',
      ].join('\n'),
    });
    console.log(`Flag notification email sent for question ${questionId}`);
  } catch (error) {
    console.error('Failed to send flag notification email:', error);
  }
}
