/**
 * CORS for the Porca Porchetta reservation endpoints.
 *
 * Allowlist only — never `*`. The matched origin is echoed back verbatim;
 * an unmatched origin receives NO CORS headers at all (and is refused), so a
 * random site cannot read a response even if it manages to issue the request.
 *
 * Extra origins (a future custom domain, a preview host) come from the optional
 * PORCA_ALLOWED_ORIGINS env var as a comma-separated list — no redeploy needed
 * to add one, just `supabase secrets set`.
 */

const STATIC_ORIGINS: readonly string[] = [
  // GitHub Pages preview: https://xerocool36.github.io/porca-porchetta/
  'https://xerocool36.github.io',
  // Custom domain, once the owner points it here.
  'https://porcaporchetta.it',
  'https://www.porcaporchetta.it',
  // Netlify origin, if the site moves off Pages.
  'https://porca-porchetta.netlify.app',
  // Local preview ports. `npx serve -l 3000 .` is the documented local server
  // (python http.server is not used here: no Range support).
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const ALLOW_HEADERS = 'authorization, apikey, content-type, x-client-info';
const ALLOW_METHODS = 'POST, OPTIONS';
const MAX_AGE_SECONDS = '86400';

export interface CorsDecision {
  /** The matched origin, or null when the request had none / an unknown one. */
  readonly origin: string | null;
  /** CORS headers to merge into every response. Empty when there is no match. */
  readonly headers: Record<string, string>;
  /** True when an Origin header was present but is not on the allowlist. */
  readonly rejected: boolean;
  /**
   * Headers for the REFUSAL response of a rejected origin, and for nothing else.
   *
   * `headers` stays empty on a rejection on purpose — it is the backstop that
   * makes a forgotten `if (cors.rejected)` check fail safe. But leaving the 403
   * itself unreadable made a misconfigured allowlist undiagnosable from the
   * field: the browser blocks the read, `fetch` rejects, and the guest is told
   * "Connessione assente" for what is actually a missing entry in
   * PORCA_ALLOWED_ORIGINS.
   *
   * So the refusal — and only the refusal — echoes the origin back, letting the
   * page read `{ok:false, error:'origin_not_allowed'}`. Nothing is given away:
   * the body is a fixed Italian string, the request is refused before the
   * database is touched, and CORS was never a server-side control anyway (curl
   * ignores it entirely). NEVER pass these to a response that carries data.
   */
  readonly refusalHeaders: Record<string, string>;
}

/** Static allowlist plus anything configured in PORCA_ALLOWED_ORIGINS. */
export function allowedOrigins(): readonly string[] {
  const extra = (Deno.env.get('PORCA_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter((value) => value.length > 0);
  return [...STATIC_ORIGINS, ...extra];
}

function headersFor(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': ALLOW_HEADERS,
    'Access-Control-Allow-Methods': ALLOW_METHODS,
    'Access-Control-Max-Age': MAX_AGE_SECONDS,
    'Vary': 'Origin',
  };
}

/**
 * Classify the request's Origin.
 *
 * No Origin header at all (curl, server-to-server, some health checks) is not
 * treated as a rejection: there is no browser to protect, so the request runs
 * and simply gets no CORS headers back.
 */
export function evaluateCors(req: Request): CorsDecision {
  const raw = req.headers.get('origin');
  if (!raw) return { origin: null, headers: {}, rejected: false, refusalHeaders: {} };

  const origin = raw.trim().replace(/\/+$/, '');
  if (!allowedOrigins().includes(origin)) {
    // `headers` stays empty (the fail-safe backstop); only the refusal is readable.
    return { origin: null, headers: {}, rejected: true, refusalHeaders: headersFor(origin) };
  }
  const headers = headersFor(origin);
  return { origin, headers, rejected: false, refusalHeaders: headers };
}

/**
 * Response for an OPTIONS preflight.
 *
 * 204 with the matched origin's headers when allowed. For an UNLISTED origin it
 * also answers 204 — with that origin echoed — so the browser goes on to send
 * the real POST, which the handler then refuses with a readable
 * `403 origin_not_allowed`. A 403 here instead would fail the preflight, and the
 * page would only ever see a network error: the misconfiguration that actually
 * caused it would be invisible.
 *
 * This grants nothing. An unlisted origin still gets exactly one thing from
 * every endpoint — the static refusal — and never reaches the database.
 */
export function preflightResponse(decision: CorsDecision): Response {
  if (decision.rejected) {
    return new Response(null, { status: 204, headers: decision.refusalHeaders });
  }
  if (!decision.origin) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: decision.headers });
}
