import { resolveMx, lookup } from 'node:dns/promises';
import { ImapFlow, type FetchMessageObject } from 'imapflow';

/**
 * `mail.sobierski.com` is Cloudflare-proxied (its DNS resolves to Cloudflare
 * anycast IPs). Cloudflare's proxy only forwards 80/443 unless Spectrum is
 * configured, so IMAPS/SMTP on the proxied hostname times out from ANY
 * network — this isn't a sandbox limitation. The domain's MX record (e.g.
 * `_dc-mx.<id>.sobierski.com`) resolves to the real, non-proxied mailserver
 * IP; connecting there directly (keeping TLS SNI as the mail hostname, and
 * `rejectUnauthorized: false` since the cert is issued for the mail
 * hostname, not the bare IP) works. This helper does that resolution once so
 * every scenario/script can just call `openMailbox()`.
 */

export interface MailboxCredentials {
  email: string;
  password: string;
}

export function requiredMailboxCredentials(): MailboxCredentials | null {
  const { QA_MAILBOX_EMAIL: email, QA_MAILBOX_PASSWORD: password } = process.env;
  if (!email || !password) return null;
  return { email, password };
}

async function resolveMailboxHost(domain: string, fallbackHost: string): Promise<string> {
  try {
    const records = await resolveMx(domain);
    if (records.length === 0) return fallbackHost;
    const best = records.sort((a, b) => a.priority - b.priority)[0];
    const { address } = await lookup(best.exchange);
    return address;
  } catch {
    return fallbackHost;
  }
}

/**
 * Opens an authenticated IMAP connection to the given mailbox, transparently
 * routing around a Cloudflare-proxied mail hostname. Caller must `logout()`.
 */
export async function openMailbox(
  { email, password }: MailboxCredentials,
  options: { imapHost?: string; imapPort?: number } = {},
): Promise<ImapFlow> {
  const domain = email.split('@')[1];
  const imapHost = options.imapHost ?? process.env.QA_MAILBOX_IMAP_HOST ?? `mail.${domain}`;
  const imapPort = options.imapPort ?? Number(process.env.QA_MAILBOX_IMAP_PORT ?? 993);
  const connectHost = await resolveMailboxHost(domain, imapHost);

  const client = new ImapFlow({
    host: connectHost,
    port: imapPort,
    secure: true,
    tls: { servername: imapHost, rejectUnauthorized: false },
    auth: { user: email, pass: password },
    logger: false,
  });
  await client.connect();
  return client;
}

/**
 * Polls INBOX for a message matching `predicate`, most-recent first.
 * Returns null if nothing matches within `timeoutMs`.
 */
export async function waitForMail(
  client: ImapFlow,
  predicate: (subject: string, from: string) => boolean,
  { timeoutMs = 30_000, pollMs = 3_000 }: { timeoutMs?: number; pollMs?: number } = {},
): Promise<FetchMessageObject | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const total = client.mailbox && typeof client.mailbox !== 'boolean' ? client.mailbox.exists : 0;
      if (total > 0) {
        const from = Math.max(1, total - 19); // newest ~20 messages
        for await (const message of client.fetch(`${from}:${total}`, { envelope: true })) {
          const subject = message.envelope?.subject ?? '';
          const fromAddr = message.envelope?.from?.[0]?.address ?? '';
          if (predicate(subject, fromAddr)) return message;
        }
      }
    } finally {
      lock.release();
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return null;
}
