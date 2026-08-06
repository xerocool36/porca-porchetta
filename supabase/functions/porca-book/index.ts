/**
 * porca-book — creates a reservation. This is the security-critical endpoint.
 *
 * Order of operations, and the order matters:
 *   1. CORS allowlist check
 *   2. body size cap + hard field validation (e-mail AND phone are BOTH required)
 *   3. honeypot (`company`) — fake success, nothing written
 *   4. Cloudflare Turnstile verification (skipped when TURNSTILE_SECRET is unset)
 *   5. per-IP rate limit through porca.rate_hit()
 *   6. porca.book() — the single source of truth for capacity
 *   7. guest confirmation e-mail, then the owner notice — NEITHER may fail the booking
 *
 * Overbooking is prevented inside the database function (advisory lock on the
 * service date + peak-covers check), not here.
 *
 * Deployed with verify_jwt = false.
 */

import { evaluateCors, preflightResponse } from '../_shared/cors.ts';
import { db } from '../_shared/db.ts';
import {
  codeChip,
  MAIL_ACCENT,
  mailShell,
  SIGN_OFF,
  VENUE_ADDRESS,
  VENUE_NAME,
  VENUE_PHONE,
} from '../_shared/mail-template.ts';
import {
  asInt,
  asString,
  clientIp,
  describeError,
  escapeHtml,
  fail,
  fetchWithTimeout,
  ipTag,
  isEmailShape,
  isHhMm,
  isIsoDate,
  json,
  MESSAGES,
  ownerRecipients,
  phoneDigits,
  rateKey,
  readJsonBody,
  romeDateLabel,
  romeTimeLabel,
  runBackground,
  sendEmail,
} from '../_shared/util.ts';

const LABEL = 'porca-book';
const MAX_BODY_BYTES = 8192;

/* -------------------------------------------------------------------------- */
/* Restaurant constants                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Sender. Production should run on a verified domain via `PORCA_MAIL_FROM`.
 * The `onboarding@resend.dev` fallback is Resend's shared sandbox: it only
 * delivers to the Resend account owner, so it is a local-development
 * convenience, never a live sender.
 */
const MAIL_FROM = Deno.env.get('PORCA_MAIL_FROM') ??
  'Porca Porchetta <onboarding@resend.dev>';

/** Where guests reply, and the address printed in the confirmation. */
const REPLY_TO = 'Porcaporchetta2025@gmail.com';

/**
 * Public site URL — the cancel link in the confirmation points here. Set to the
 * live domain via `PORCA_SITE_URL`; the fallback is the Pages preview.
 */
const SITE_URL = (Deno.env.get('PORCA_SITE_URL') ??
  'https://xerocool36.github.io/porca-porchetta').replace(/\/+$/, '');

/**
 * Hard online party cap, owner-confirmed. The database is the real authority
 * (porca.settings.max_party = 8, enforced inside porca.book()); this constant
 * refuses the same thing one layer earlier so an oversized party never even
 * takes a database round-trip. Bigger tables phone the fraschetta directly.
 */
const MAX_PARTY_ONLINE = 8;

/** Minimum digits in a phone number once +, spaces and separators are stripped. */
const MIN_PHONE_DIGITS = 8;

/**
 * Rate limit per hashed IP. porca.rate_hit(ip_hash, max_hour, max_day) — both
 * numbers are caps: booking attempts in the current hour and across a rolling
 * 24 hours.
 */
const MAX_PER_HOUR = 5;
const MAX_PER_DAY = 20;

/** 8th text argument of porca.book(): the channel the reservation came from. */
const BOOKING_SOURCE = 'web';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

interface BookingInput {
  party: number;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  token: string;
}

export type BookErrorSlug =
  | 'not_accepting'
  | 'closed'
  | 'no_such_slot'
  | 'too_late'
  | 'too_far'
  | 'party_too_large'
  | 'duplicate'
  | 'full'
  | 'invalid_name'
  | 'invalid_phone'
  | 'invalid_email'
  | 'invalid_party'
  | 'retry';

export interface BookSuccess {
  ok: true;
  code: string;
  starts_at: string;
  ends_at: string;
  service: string;
  party: number;
  phone_tail: string;
}

export interface BookFailure {
  ok: false;
  error: BookErrorSlug;
  message: string;
}

export type BookResult = BookSuccess | BookFailure;

/** Slugs that mean "the slot is gone", i.e. a conflict rather than bad input. */
const CONFLICT_SLUGS: ReadonlySet<string> = new Set(['full', 'duplicate']);

/* -------------------------------------------------------------------------- */
/* Validation — e-mail and phone are BOTH mandatory                            */
/* -------------------------------------------------------------------------- */

type Validation =
  | { ok: true; value: BookingInput }
  | { ok: false; field: string };

function validate(body: Record<string, unknown>): Validation {
  const party = asInt(body.party);
  if (party === null || party < 1) return { ok: false, field: 'party' };
  if (party > MAX_PARTY_ONLINE) return { ok: false, field: 'party_too_large' };

  if (!isIsoDate(body.date)) return { ok: false, field: 'date' };
  if (!isHhMm(body.time)) return { ok: false, field: 'time' };

  const name = asString(body.name);
  if (name.length < 2 || name.length > 80) return { ok: false, field: 'name' };

  // Required. At least 8 digits once spaces, +, - and brackets are stripped.
  const phone = asString(body.phone);
  if (phone.length > 32 || phoneDigits(phone).length < MIN_PHONE_DIGITS) {
    return { ok: false, field: 'phone' };
  }

  // Required — the confirmation e-mail is the booking receipt and carries the
  // cancel link, so a booking without a valid address is not accepted.
  const email = asString(body.email).toLowerCase();
  if (!isEmailShape(email)) return { ok: false, field: 'email' };

  const notes = asString(body.notes);
  if (notes.length > 400) return { ok: false, field: 'notes' };

  if (body.consent !== true) return { ok: false, field: 'consent' };

  return {
    ok: true,
    value: {
      party,
      date: body.date,
      time: body.time,
      name,
      phone,
      email,
      notes,
      token: asString(body.token),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Bot defences                                                                */
/* -------------------------------------------------------------------------- */

/** True when the hidden `company` field was filled in — i.e. a bot. */
function honeypotTripped(body: Record<string, unknown>): boolean {
  const value = body.company;
  if (value === undefined || value === null) return false;
  return asString(value).length > 0;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A plausible-looking code for the honeypot reply. Never touches the database. */
function decoyCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return 'PP-' + Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

/**
 * Verify the Turnstile token. Fails closed on a network error or a bad token.
 * With TURNSTILE_SECRET unset the check is skipped so local development works —
 * that path logs loudly, because in production it is a hole.
 */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET');
  if (!secret) {
    console.warn(
      `[${LABEL}] TURNSTILE_SECRET is not set — CAPTCHA verification is DISABLED. ` +
        'This is acceptable only in local development.',
    );
    return true;
  }
  if (!token) return false;

  const form = new URLSearchParams({ secret, response: token });
  if (ip && ip !== 'unknown') form.set('remoteip', ip);

  try {
    const response = await fetchWithTimeout(
      TURNSTILE_VERIFY_URL,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form.toString(), // contains the secret — never log this
      },
      5000,
    );
    if (!response.ok) {
      console.error(`[${LABEL}] turnstile http ${response.status}`);
      return false;
    }
    const outcome = await response.json() as { success?: boolean; 'error-codes'?: string[] };
    if (outcome.success !== true) {
      console.warn(`[${LABEL}] turnstile rejected: ${(outcome['error-codes'] ?? []).join(',')}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[${LABEL}] turnstile verify failed: ${describeError(error)}`);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Guest confirmation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The cancel link. There is no separate secret column: exactly as upstream, the
 * pair (booking code + last 4 phone digits) IS the cancel token, and
 * porca.cancel() refuses anything else with an indistinguishable `not_found`.
 * Both halves belong to the guest, and the link only ever travels to the
 * address on the booking.
 *
 * The destination is the dedicated booking page, not the home page with an
 * anchor: someone who just wants to free the table should not have to scroll.
 */
function cancelLink(code: string, phoneTail: string): string {
  const params = new URLSearchParams({ annulla: code, t: phoneTail });
  return `${SITE_URL}/prenota.html?${params.toString()}`;
}

function buildGuestEmail(booking: BookSuccess, input: BookingInput) {
  const startsAt = new Date(booking.starts_at);
  const dateLabel = romeDateLabel(startsAt); // "sabato 9 agosto 2026"
  const timeLabel = romeTimeLabel(startsAt); // "20:30"
  const people = booking.party === 1 ? '1 persona' : `${booking.party} persone`;
  const link = cancelLink(booking.code, booking.phone_tail);

  const subject = `Prenotazione confermata · ${dateLabel} alle ${timeLabel} · ${VENUE_NAME}`;

  const text = [
    `Ciao ${input.name},`,
    '',
    `la tua prenotazione da ${VENUE_NAME} è confermata.`,
    '',
    `Data:     ${dateLabel}`,
    `Ora:      ${timeLabel}`,
    `Persone:  ${people}`,
    `Nome:     ${input.name}`,
    `Codice:   ${booking.code}`,
    ...(input.notes ? [`Note:     ${input.notes}`] : []),
    '',
    `Dove siamo: ${VENUE_ADDRESS}`,
    `Telefono:   ${VENUE_PHONE}`,
    '',
    'Se hai un imprevisto puoi annullare da qui:',
    link,
    '',
    'Ti chiediamo solo di avvisarci per tempo: il tavolo torna disponibile per qualcun altro.',
    'Teniamo il tavolo per circa 15 minuti dopo l’orario prenotato.',
    '',
    'A presto,',
    SIGN_OFF,
  ].join('\n');

  const html = mailShell({
    eyebrow: 'Prenotazione confermata',
    title: `${dateLabel} alle ${timeLabel}`,
    intro: `Ciao ${input.name}, il tuo tavolo è prenotato. Ti aspettiamo.`,
    rows: [
      { label: 'Persone', value: escapeHtml(people) },
      { label: 'A nome di', value: escapeHtml(input.name) },
      { label: 'Codice', value: codeChip(booking.code) },
      ...(input.notes ? [{ label: 'Note', value: escapeHtml(input.notes) }] : []),
    ],
    action: { label: 'Annulla la prenotazione', href: link },
    notes: [
      'Se hai un imprevisto annulla per tempo: il tavolo torna libero per qualcun altro.',
      'Teniamo il tavolo per circa 15 minuti dopo l’orario prenotato.',
    ],
  });

  return { subject, text, html };
}

/* -------------------------------------------------------------------------- */
/* Owner notification (optional, background)                                   */
/* -------------------------------------------------------------------------- */

function buildOwnerEmail(booking: BookSuccess, input: BookingInput) {
  const startsAt = new Date(booking.starts_at);
  const dateLabel = romeDateLabel(startsAt);
  const timeLabel = romeTimeLabel(startsAt);

  const name = escapeHtml(input.name);
  const phone = escapeHtml(input.phone);
  const telHref = escapeHtml(input.phone.replace(/[^\d+]/g, ''));
  const email = escapeHtml(input.email);
  const notes = input.notes ? escapeHtml(input.notes) : '—';

  const subject =
    `Nuova prenotazione · ${dateLabel} ${timeLabel} · ${booking.party} pax · ${input.name}`;

  const text = [
    `NUOVA PRENOTAZIONE — ${VENUE_NAME}`,
    '',
    `Data:      ${dateLabel}`,
    `Ora:       ${timeLabel}`,
    `Coperti:   ${booking.party}`,
    `Nome:      ${input.name}`,
    `Telefono:  ${input.phone}`,
    `Email:     ${input.email}`,
    `Note:      ${input.notes || '—'}`,
    '',
    `Codice prenotazione: ${booking.code}`,
  ].join('\n');

  const html = mailShell({
    internal: true,
    eyebrow: 'Nuova prenotazione',
    title: `${dateLabel} alle ${timeLabel}`,
    rows: [
      { label: 'Coperti', value: `<strong>${booking.party}</strong>` },
      { label: 'Nome', value: name },
      {
        label: 'Telefono',
        value:
          `<a href="tel:${telHref}" style="color:${MAIL_ACCENT};text-decoration:none">${phone}</a>`,
      },
      { label: 'Email', value: `<a href="mailto:${email}" style="color:${MAIL_ACCENT}">${email}</a>` },
      { label: 'Note', value: notes },
      { label: 'Codice', value: codeChip(booking.code) },
    ],
  });

  return { subject, text, html };
}

/* -------------------------------------------------------------------------- */
/* Handler                                                                     */
/* -------------------------------------------------------------------------- */

Deno.serve(async (req: Request): Promise<Response> => {
  // 1 — CORS
  const cors = evaluateCors(req);
  if (req.method === 'OPTIONS') return preflightResponse(cors);
  if (cors.rejected) return fail('origin_not_allowed', 403);
  if (req.method !== 'POST') return fail('method_not_allowed', 405, cors.headers);

  // 2 — body + validation
  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if (!parsed.ok) {
    return fail(parsed.slug, parsed.slug === 'payload_too_large' ? 413 : 400, cors.headers);
  }

  const ip = clientIp(req);

  // 3 — honeypot: answer like a success so the bot learns nothing, write nothing.
  if (honeypotTripped(parsed.body)) {
    const key = await rateKey(ip, 'honeypot').catch(() => 'unhashed');
    console.warn(`[${LABEL}] honeypot tripped ip=${ipTag(key)} — no database write`);
    const now = new Date();
    return json({
      ok: true,
      code: decoyCode(),
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + 90 * 60_000).toISOString(),
      service: 'cena',
      party: 2,
      phone_tail: '0000',
      emailSent: true,
    }, 200, cors.headers);
  }

  const check = validate(parsed.body);
  if (!check.ok) {
    if (check.field === 'consent') return fail('consent_required', 400, cors.headers);
    if (check.field === 'email') return fail('invalid_email', 400, cors.headers, { field: 'email' });
    if (check.field === 'phone') return fail('invalid_phone', 400, cors.headers, { field: 'phone' });
    if (check.field === 'party_too_large') {
      return fail('party_too_large', 400, cors.headers, { max_party: MAX_PARTY_ONLINE });
    }
    return fail('invalid_body', 400, cors.headers, { field: check.field });
  }
  const input = check.value;

  // 4 — Turnstile
  if (!await verifyTurnstile(input.token, ip)) {
    return fail('captcha_failed', 403, cors.headers);
  }

  try {
    const sql = db();

    // 5 — rate limit on the salted IP hash
    const key = await rateKey(ip);
    const gate = await sql<{ allowed: boolean }[]>`
      select porca.rate_hit(${key}::text, ${MAX_PER_HOUR}::int, ${MAX_PER_DAY}::int) as allowed
    `;
    if (gate[0]?.allowed !== true) {
      console.warn(`[${LABEL}] rate limited ip=${ipTag(key)}`);
      return fail('rate_limited', 429, { ...cors.headers, 'Retry-After': '600' });
    }

    // 6 — the booking itself; capacity is enforced inside the function
    const rows = await sql<{ result: BookResult }[]>`
      select porca.book(
        ${input.party}::int,
        ${input.date}::date,
        ${input.time}::time,
        ${input.name}::text,
        ${input.phone}::text,
        ${input.email}::text,
        ${input.notes || null}::text,
        ${BOOKING_SOURCE}::text
      ) as result
    `;
    const result = rows[0]?.result;
    if (!result) throw new Error('porca.book() returned no row');

    if (result.ok === false) {
      const status = CONFLICT_SLUGS.has(result.error) ? 409 : 400;
      console.log(`[${LABEL}] refused: ${result.error} ip=${ipTag(key)}`);
      return json({
        ok: false,
        error: result.error,
        message: result.message || MESSAGES.server_error,
      }, status, cors.headers);
    }

    console.log(`[${LABEL}] confirmed code=${result.code} party=${result.party}`);

    // 7a — guest confirmation.
    //
    // AWAITED, because the response tells the widget whether to say "controlla la
    // tua email". It can NEVER change the booking outcome: any throw is caught,
    // logged and turned into emailSent:false. The booking row already exists and
    // stays exactly as it is.
    let emailSent = false;
    try {
      await sendEmail({
        from: MAIL_FROM,
        to: [input.email],
        replyTo: REPLY_TO,
        ...buildGuestEmail(result, input),
      }, LABEL);
      emailSent = true;
    } catch (error) {
      // No guest address, no Resend key, Resend down, 4xx from Resend — all the
      // same here: the table is booked, the e-mail simply did not go out.
      console.error(
        `[${LABEL}] guest confirmation failed code=${result.code}: ${describeError(error)}`,
      );
    }

    // 7b — internal notice, fire-and-forget. Skipped when PORCA_NOTIFY_EMAIL is unset.
    const owners = ownerRecipients();
    if (owners.length > 0) {
      runBackground(
        (async () => {
          try {
            await sendEmail({
              from: MAIL_FROM,
              to: owners,
              replyTo: input.email,
              ...buildOwnerEmail(result, input),
            }, LABEL);
          } catch (error) {
            console.error(`[${LABEL}] owner notice failed: ${describeError(error)}`);
          }
        })(),
        LABEL,
      );
    } else {
      console.log(`[${LABEL}] owner notice skipped: PORCA_NOTIFY_EMAIL not set`);
    }

    return json({ ...result, emailSent }, 200, cors.headers);
  } catch (error) {
    console.error(`[${LABEL}] ${describeError(error)}`);
    return fail('server_error', 500, cors.headers);
  }
});
