/**
 * Shared helpers for the Porca Porchetta functions: JSON responses, the Italian
 * error vocabulary, salted IP hashing, body reading, Rome-timezone formatting
 * and the Resend transport.
 *
 * Rule that applies to every function in this folder: no secret value, no raw
 * IP and no guest personal data is ever written to a log line or a response.
 */

/* -------------------------------------------------------------------------- */
/* Responses                                                                   */
/* -------------------------------------------------------------------------- */

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

/** Every response this API returns is JSON, errors included. */
export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

/**
 * Italian, guest-facing messages. Postgres error text never reaches the client:
 * anything unexpected collapses into `server_error`.
 *
 * `porca.book()` returns its own Italian `message` for the booking slugs; the
 * copy here is the fallback used when the function itself did not supply one.
 *
 * The number quoted is the fraschetta's landline, 06 6549 5256. There is no
 * WhatsApp for this venue — never offer one here.
 */
export const MESSAGES = {
  // porca.book() outcomes
  not_accepting: 'Al momento non prendiamo prenotazioni online. Chiamaci pure al 06 6549 5256.',
  closed: 'Siamo chiusi in questa data.',
  no_such_slot: 'Questo orario non è disponibile.',
  too_late: 'È troppo tardi per prenotare online questo orario. Chiamaci pure.',
  too_far: 'Questa data è troppo lontana: le prenotazioni online aprono più avanti.',
  // NO NUMBER HERE ON PURPOSE. The real cap is porca.settings.max_party and
  // porca.book() builds the exact sentence from it ("Per gruppi oltre 8
  // persone…"); porca-book returns that message verbatim. This copy is only the
  // fallback for the outer-bound refusal (party > 40), so hard-coding 8 in it
  // would go stale the day the owner raises the setting in the console.
  party_too_large:
    'Per gruppi numerosi chiamaci al 06 6549 5256 — li gestiamo direttamente noi.',
  duplicate: 'Risulta già una prenotazione con questo numero per questa data.',
  full: 'Non ci sono più posti per questo orario. Prova con un altro orario.',
  // porca.cancel() outcome — deliberately generic
  not_found: 'Prenotazione non trovata. Controlla il codice e le ultime cifre del telefono.',
  // transport / validation
  invalid_body: 'Dati non validi. Controlla i campi e riprova.',
  invalid_email: 'Inserisci un indirizzo email valido: ti mandiamo lì la conferma.',
  // Same rule as party_too_large: the digit floor lives in porca.book() and its
  // message comes back verbatim. Quoting "almeno 8 cifre" here would duplicate it.
  invalid_phone: 'Inserisci un numero di telefono valido.',
  payload_too_large: 'Richiesta troppo grande.',
  method_not_allowed: 'Metodo non consentito.',
  origin_not_allowed: 'Origine non consentita.',
  consent_required: 'Per prenotare devi acconsentire al trattamento dei dati.',
  captcha_failed: 'Verifica di sicurezza non riuscita. Ricarica la pagina e riprova.',
  rate_limited: 'Troppe richieste dallo stesso collegamento. Riprova tra qualche minuto.',
  unauthorized: 'Accesso non autorizzato.',
  forbidden: 'Accesso negato.',
  unknown_action: 'Azione non riconosciuta.',
  server_error: 'Si è verificato un errore. Riprova tra qualche istante.',
} as const;

export type ErrorSlug = keyof typeof MESSAGES;

/** `{ok:false, error, message}` plus any extra context, with CORS headers. */
export function fail(
  slug: ErrorSlug,
  status: number,
  headers: Record<string, string> = {},
  extra: Record<string, unknown> = {},
): Response {
  return json({ ok: false, error: slug, message: MESSAGES[slug], ...extra }, status, headers);
}

/* -------------------------------------------------------------------------- */
/* Request helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Caller IP: first entry of x-forwarded-for, else cf-connecting-ip. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('cf-connecting-ip')?.trim() || 'unknown';
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

let saltWarned = false;

/**
 * Salted hash of the caller IP, used as the `porca.rate_hit()` bucket key.
 * A raw IP is never stored, logged or sent anywhere.
 *
 * `scope` keeps each endpoint's counter independent; porca-book uses the
 * unscoped key.
 */
export async function rateKey(ip: string, scope = ''): Promise<string> {
  const salt = Deno.env.get('PORCA_IP_SALT') ?? '';
  if (!salt && !saltWarned) {
    saltWarned = true;
    console.warn('[porca] PORCA_IP_SALT is not set — rate-limit keys are unsalted.');
  }
  return await sha256Hex(scope ? `${scope}:${ip}${salt}` : `${ip}${salt}`);
}

/** Short, non-reversible tag for correlating log lines with a caller. */
export function ipTag(hashedKey: string): string {
  return hashedKey.slice(0, 12);
}

export type BodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; slug: 'invalid_body' | 'payload_too_large' };

/** Read and JSON-parse the request body, refusing anything over `maxBytes`. */
export async function readJsonBody(req: Request, maxBytes = 8192): Promise<BodyResult> {
  const declared = Number(req.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, slug: 'payload_too_large' };
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, slug: 'invalid_body' };
  }

  if (new TextEncoder().encode(raw).length > maxBytes) {
    return { ok: false, slug: 'payload_too_large' };
  }
  if (!raw.trim()) return { ok: true, body: {} };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, slug: 'invalid_body' };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, slug: 'invalid_body' };
  }
}

/* -------------------------------------------------------------------------- */
/* Dates — always Europe/Rome, never string arithmetic                          */
/* -------------------------------------------------------------------------- */

export const ROME = 'Europe/Rome';

/** Today in Rome as YYYY-MM-DD (en-CA formats as ISO). */
export function romeToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ROME,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const stamp = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(stamp)) return false;
  // Rejects impossible dates such as 2026-02-31, which Date.parse would roll over.
  return new Date(stamp).toISOString().slice(0, 10) === value;
}

export function isHhMm(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  return Number(value.slice(0, 2)) < 24 && Number(value.slice(3, 5)) < 60;
}

/** Calendar-day arithmetic on a YYYY-MM-DD string, done in UTC so DST cannot shift it. */
export function addDays(isoDate: string, days: number): string {
  const stamp = Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000;
  return new Date(stamp).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/** "sabato 9 agosto 2026" — formatted from the instant, not by slicing strings. */
export function romeDateLabel(instant: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: ROME,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(instant);
}

/** "20:30" in Rome, from the instant. */
export function romeTimeLabel(instant: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: ROME,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instant);
}

/* -------------------------------------------------------------------------- */
/* Outbound calls                                                              */
/* -------------------------------------------------------------------------- */

/** fetch with a hard timeout so a slow third party cannot hang the function. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 5000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface OutboundEmail {
  /** Full "Name <address>" sender. Owned by the caller — see MAIL_FROM in porca-book. */
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/**
 * Send one e-mail through Resend.
 *
 * Throws on a missing key, an empty recipient list or a non-2xx response, so
 * the caller decides what that means. NOTHING in this codebase may let a mail
 * failure change a booking outcome: every call site wraps this in try/catch.
 *
 * PORCA_RESEND_API_KEY is an Edge Function secret. It is read here and nowhere
 * else, it never appears in a response, and it is never logged.
 *
 * The name is deliberately prefixed. Edge Function secrets are scoped to the
 * PROJECT, not to the function, and for the preview this schema shares a project
 * with other tenants — one of which has already set a bare `RESEND_API_KEY`.
 * Reading that name here would quietly send this venue's guest mail through
 * somebody else's Resend account, from their verified domain, against their
 * daily quota. Prefixing makes that impossible rather than merely unlikely.
 *
 * It is currently UNSET on purpose: Porca Porchetta has no domain and no Resend
 * account yet, and both will be opened in the owner's own name. Until then
 * sendEmail() throws, every call site swallows it, and a booking still confirms
 * on screen with its code. Set this — and PORCA_MAIL_FROM, on a domain verified
 * in the owner's own Resend account — to switch mail on.
 */
export async function sendEmail(mail: OutboundEmail, label: string): Promise<void> {
  const apiKey = Deno.env.get('PORCA_RESEND_API_KEY');
  if (!apiKey) throw new Error('PORCA_RESEND_API_KEY is not set');

  const recipients = mail.to.map((value) => value.trim()).filter((value) => value.length > 0);
  if (recipients.length === 0) throw new Error('no recipients');

  const response = await fetchWithTimeout(
    RESEND_ENDPOINT,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`, // secret — never log this header
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: mail.from,
        to: recipients,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
    },
    5000,
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`resend responded ${response.status}: ${detail.slice(0, 300)}`);
  }
  console.log(`[${label}] e-mail queued (${recipients.length} recipient(s))`);
}

/**
 * Recipients for the internal "new booking" notice, from PORCA_NOTIFY_EMAIL
 * (comma-separated). Empty list = the owner notice is skipped entirely; the
 * guest confirmation is a separate, always-attempted mail.
 */
export function ownerRecipients(): string[] {
  return (Deno.env.get('PORCA_NOTIFY_EMAIL') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/**
 * Run a side effect without blocking the response. On Supabase Edge Runtime the
 * instance is kept alive by waitUntil(); locally the promise just runs detached.
 */
export function runBackground(task: Promise<unknown>, label: string): void {
  const guarded = task.catch((error: unknown) => {
    console.error(`[${label}] background task failed: ${describeError(error)}`);
  });
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
    .EdgeRuntime;
  if (runtime && typeof runtime.waitUntil === 'function') {
    runtime.waitUntil(guarded);
  }
}

/** Log-safe error text. Never interpolate a request body or a secret into this. */
export function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

/** Escape guest-supplied text before it goes into any e-mail HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Strict integer read: rejects "3", 3.5 and NaN alike. */
export function asInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Conservative e-mail shape check. Deliverability is Resend's problem; this only
 * refuses input that cannot be an address. Mirrors the regex in porca.book().
 */
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmailShape(value: string): boolean {
  return value.length > 0 && value.length <= 120 && EMAIL_SHAPE.test(value);
}

/** Digits only, after stripping spaces, +, -, ( ) and anything else. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}
