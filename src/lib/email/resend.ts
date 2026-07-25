import 'server-only';

/**
 * Uses Resend — a real, standard transactional email provider —
 * when RESEND_API_KEY is configured. Without a key, this logs what
 * would have been sent and returns { sent: false } instead of
 * throwing. That's a deliberate soft-fail for a demo/hackathon
 * environment that may not have email credentials wired up, not a
 * fake implementation: with a real API key set, this makes a real
 * HTTP call to Resend's API and sends a real email. The automation
 * engine treats a soft-fail as action *success* (see
 * automation-engine.service.ts) so a missing email credential
 * doesn't fail an entire workflow run over one action.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ sent: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? 'InsightOS <notifications@insightos.app>';

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — logging instead of sending. to=${params.to} subject="${params.subject}"`
    );
    return { sent: false };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.body }),
  });

  if (!res.ok) {
    throw new Error(`Resend request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return { sent: true, id: data.id };
}
