/**
 * porca-availability — public, read-only slot map for the booking widget.
 *
 * POST { party?: int, from?: "YYYY-MM-DD", to?: "YYYY-MM-DD" }
 *   party defaults to 2 and is clamped to 1..10 (the hard online cap is 8 and it
 *         lives in porca.settings.max_party — this clamp only stops a silly
 *         number reaching the database; slots come back with ok:false above the
 *         cap so the widget can explain why)
 *   from  defaults to today in Europe/Rome
 *   to    defaults to from + 13 days (the widget shows a 14-day strip), capped
 *         at from + 30
 *
 * Returns the `porca.availability()` jsonb with occupancy removed: every slot
 * goes out as { time, ok } and the per-slot `remaining` seat count never leaves
 * the server (owner's rule — see stripOccupancy). The payload carries no
 * personal data and no occupancy, so it is safe to cache briefly at the edge.
 * No CAPTCHA here (it is cheap and read-only) but the IP is still rate-limited
 * at 120/hour and 600/day so nobody can use it to hammer the database.
 *
 * A closed day comes back as closed:true with services:[] — that is how Monday
 * arrives, because the seed has no service_windows row for dow = 1 at all.
 *
 * Deployed with verify_jwt = false.
 */

import { evaluateCors, preflightResponse } from '../_shared/cors.ts';
import { db } from '../_shared/db.ts';
import {
  addDays,
  clamp,
  clientIp,
  daysBetween,
  describeError,
  fail,
  ipTag,
  isIsoDate,
  json,
  rateKey,
  readJsonBody,
  romeToday,
} from '../_shared/util.ts';

const LABEL = 'porca-availability';
const DEFAULT_PARTY = 2;
const MIN_PARTY = 1;
const MAX_PARTY = 10;
const DEFAULT_WINDOW_DAYS = 13;
const MAX_WINDOW_DAYS = 30;

/**
 * Rate limit per hashed IP. porca.rate_hit(ip_hash, max_hour, max_day) — both
 * numbers are caps: calls in the current hour and across a rolling 24 hours.
 * Generous, because this endpoint is cheap, read-only and re-polled by the
 * widget every time the party size changes.
 */
const MAX_PER_HOUR = 120;
const MAX_PER_DAY = 600;

export interface AvailabilitySlot {
  time: string;
  /** Seats left. PRIVATE — stripped by stripOccupancy() before the response. */
  remaining: number;
  ok: boolean;
}

/** What the public actually receives: bookable or not, never how full we are. */
export interface PublicAvailabilitySlot {
  time: string;
  ok: boolean;
}

export interface AvailabilityService {
  service: string;
  slots: AvailabilitySlot[];
}

export interface PublicAvailabilityService {
  service: string;
  slots: PublicAvailabilitySlot[];
}

export interface AvailabilityDay {
  date: string;
  dow: number;
  closed: boolean;
  utc_offset: string;
  note: string | null;
  services: AvailabilityService[];
}

export interface PublicAvailabilityDay extends Omit<AvailabilityDay, 'services'> {
  services: PublicAvailabilityService[];
}

export interface AvailabilityPayload {
  rome_now: string;
  rome_today: string;
  capacity: number;
  max_party: number;
  accepting: boolean;
  turn_minutes: number;
  party: number;
  days: AvailabilityDay[];
}

export interface PublicAvailabilityPayload extends Omit<AvailabilityPayload, 'days'> {
  days: PublicAvailabilityDay[];
}

/**
 * Occupancy is private. `porca.availability()` returns how many seats are left
 * in every slot because the admin console needs it; the public widget must not
 * see it — owner's rule. A guest reading "2 posti" learns exactly how full the
 * room is, and that is nobody's business but the house's. `ok` already carries
 * the only thing the widget has to know: bookable, or esaurito.
 */
function stripOccupancy(payload: AvailabilityPayload): PublicAvailabilityPayload {
  return {
    ...payload,
    days: (payload.days ?? []).map((day) => ({
      ...day,
      services: (day.services ?? []).map((service) => ({
        ...service,
        slots: (service.slots ?? []).map((slot) => ({ time: slot.time, ok: slot.ok })),
      })),
    })),
  };
}

interface Range {
  party: number;
  from: string;
  to: string;
}

/** Lenient by design: unusable input is clamped rather than refused. */
function resolveRange(body: Record<string, unknown>): Range {
  const rawParty = typeof body.party === 'number' && Number.isFinite(body.party)
    ? Math.round(body.party)
    : DEFAULT_PARTY;
  const party = clamp(rawParty, MIN_PARTY, MAX_PARTY);

  const today = romeToday();
  const from = isIsoDate(body.from) ? body.from : today;

  let to = isIsoDate(body.to) ? body.to : addDays(from, DEFAULT_WINDOW_DAYS);
  if (daysBetween(from, to) < 0) to = from;
  if (daysBetween(from, to) > MAX_WINDOW_DAYS) to = addDays(from, MAX_WINDOW_DAYS);

  return { party, from, to };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = evaluateCors(req);
  if (req.method === 'OPTIONS') return preflightResponse(cors);
  if (cors.rejected) return fail('origin_not_allowed', 403);
  if (req.method !== 'POST') return fail('method_not_allowed', 405, cors.headers);

  const parsed = await readJsonBody(req, 4096);
  if (!parsed.ok) {
    return fail(parsed.slug, parsed.slug === 'payload_too_large' ? 413 : 400, cors.headers);
  }

  const { party, from, to } = resolveRange(parsed.body);

  try {
    const sql = db();
    const key = await rateKey(clientIp(req), 'avail');

    const gate = await sql<{ allowed: boolean }[]>`
      select porca.rate_hit(${key}::text, ${MAX_PER_HOUR}::int, ${MAX_PER_DAY}::int) as allowed
    `;
    if (gate[0]?.allowed !== true) {
      console.warn(`[${LABEL}] rate limited ip=${ipTag(key)}`);
      return fail('rate_limited', 429, { ...cors.headers, 'Retry-After': '60' });
    }

    const rows = await sql<{ data: AvailabilityPayload }[]>`
      select porca.availability(${party}::int, ${from}::date, ${to}::date) as data
    `;
    const payload = rows[0]?.data;
    if (!payload) throw new Error('porca.availability() returned no row');

    return json(stripOccupancy(payload), 200, {
      ...cors.headers,
      'Cache-Control': 'public, max-age=20',
    });
  } catch (error) {
    // The real Postgres message stays in the logs; the client gets a generic one.
    console.error(`[${LABEL}] ${describeError(error)}`);
    return fail('server_error', 500, cors.headers);
  }
});
