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
  if (!raw) return { origin: null, headers: {}, rejected: false };

  const origin = raw.trim().replace(/\/+$/, '');
  if (!allowedOrigins().includes(origin)) {
    return { origin: null, headers: {}, rejected: true };
  }
  return { origin, headers: headersFor(origin), rejected: false };
}

/** Response for an OPTIONS preflight. 204 when allowed, bare 403 otherwise. */
export function preflightResponse(decision: CorsDecision): Response {
  if (decision.rejected || !decision.origin) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: decision.headers });
}
