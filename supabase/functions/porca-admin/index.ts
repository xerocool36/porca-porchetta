/**
 * porca-admin — the fraschetta's back-office endpoint.
 *
 * Declared with verify_jwt = false in config.toml, but authentication is
 * enforced here in code: a Supabase user JWT is required, it is verified with
 * supabase-js, and the user id must pass porca.is_admin(). supabase-js is used
 * for that check only — never for data, because the `porca` schema is not
 * exposed through PostgREST.
 *
 * POST { action, ... }
 *   day         { from?: date, to?: date }            -> porca.admin_day()
 *   set_status  { id: uuid, status: text }            -> porca.admin_set_status()
 *   block       { date: date, note?, on?, band? }     -> porca.admin_block()
 *   settings    { patch: object }                     -> porca.admin_settings()
 *   windows     { rows: array }                       -> porca.admin_windows()
 * Anything else is a 400. There is no default branch that acts.
 *
 * `band` on `block` is OPTIONAL. Omitted, null or "" all mean the whole day, so a
 * console that predates half-day closures keeps working unchanged; "pranzo" or
 * "cena" shuts one service and leaves the other bookable.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { evaluateCors, preflightResponse } from '../_shared/cors.ts';
import { db } from '../_shared/db.ts';
import {
  asString,
  describeError,
  fail,
  isIsoDate,
  json,
  readJsonBody,
  romeToday,
} from '../_shared/util.ts';

const LABEL = 'porca-admin';
const MAX_BODY_BYTES = 32_768;
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AdminAction = 'day' | 'set_status' | 'block' | 'settings' | 'windows';

const ACTIONS: ReadonlySet<string> = new Set<AdminAction>([
  'day',
  'set_status',
  'block',
  'settings',
  'windows',
]);

/**
 * The services a closure can shut on its own. Mirrors porca.closures_band_chk;
 * the empty string is the console's way of saying "whole day" from a <select>,
 * and is sent on as SQL NULL.
 */
const BANDS: ReadonlySet<string> = new Set(['pranzo', 'cena']);

/** Resolve the caller's user id from the bearer token, or null. */
async function authenticate(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    throw new Error('missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = evaluateCors(req);
  if (req.method === 'OPTIONS') return preflightResponse(cors);
  // Refused, but READABLE: refusalHeaders echoes the unlisted origin so the page
  // can show "Origine non consentita" instead of a bare network error. See cors.ts.
  if (cors.rejected) return fail('origin_not_allowed', 403, cors.refusalHeaders);
  if (req.method !== 'POST') return fail('method_not_allowed', 405, cors.headers);

  let userId: string | null;
  try {
    userId = await authenticate(req);
  } catch (error) {
    console.error(`[${LABEL}] auth setup failed: ${describeError(error)}`);
    return fail('server_error', 500, cors.headers);
  }
  if (!userId) return fail('unauthorized', 401, cors.headers);

  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if (!parsed.ok) {
    return fail(parsed.slug, parsed.slug === 'payload_too_large' ? 413 : 400, cors.headers);
  }
  const body = parsed.body;

  try {
    const sql = db();

    const adminRows = await sql<{ ok: boolean }[]>`
      select porca.is_admin(${userId}::uuid) as ok
    `;
    if (adminRows[0]?.ok !== true) {
      console.warn(`[${LABEL}] non-admin user rejected`);
      return fail('forbidden', 403, cors.headers);
    }

    const action = asString(body.action);
    if (!ACTIONS.has(action)) return fail('unknown_action', 400, cors.headers);

    switch (action) {
      case 'day': {
        const from = isIsoDate(body.from) ? body.from : romeToday();
        const to = isIsoDate(body.to) ? body.to : from;
        const rows = await sql<{ data: unknown }[]>`
          select porca.admin_day(${from}::date, ${to}::date) as data
        `;
        return json({ ok: true, action, data: rows[0]?.data ?? null }, 200, cors.headers);
      }

      case 'set_status': {
        const id = asString(body.id);
        const status = asString(body.status);
        if (!UUID_SHAPE.test(id)) return fail('invalid_body', 400, cors.headers, { field: 'id' });
        if (status.length < 2 || status.length > 32) {
          return fail('invalid_body', 400, cors.headers, { field: 'status' });
        }
        const rows = await sql<{ data: unknown }[]>`
          select porca.admin_set_status(${id}::uuid, ${status}::text) as data
        `;
        return json({ ok: true, action, data: rows[0]?.data ?? null }, 200, cors.headers);
      }

      case 'block': {
        if (!isIsoDate(body.date)) {
          return fail('invalid_body', 400, cors.headers, { field: 'date' });
        }
        const note = asString(body.note);
        if (note.length > 200) return fail('invalid_body', 400, cors.headers, { field: 'note' });
        const on = body.on === undefined ? true : body.on === true;
        // Absent / null / "" all mean the whole day. A bandless call keeps its
        // original meaning, so the console does not have to change to keep working.
        const band = asString(body.band);
        if (band && !BANDS.has(band)) {
          return fail('invalid_body', 400, cors.headers, { field: 'band' });
        }
        const rows = await sql<{ data: unknown }[]>`
          select porca.admin_block(
            ${body.date}::date, ${note || null}::text, ${on}::boolean, ${band || null}::text
          ) as data
        `;
        return json({ ok: true, action, data: rows[0]?.data ?? null }, 200, cors.headers);
      }

      case 'settings': {
        const patch = body.patch;
        if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
          return fail('invalid_body', 400, cors.headers, { field: 'patch' });
        }
        // sql.json(), NOT JSON.stringify(): postgres.js serialises the value
        // itself, so stringifying here encodes it twice and the function receives
        // a jsonb *string*. jsonb_typeof() then reads 'string', the `<> 'object'`
        // guard fires, and every settings save comes back `bad_patch`.
        const rows = await sql<{ data: unknown }[]>`
          select porca.admin_settings(${sql.json(patch)}::jsonb) as data
        `;
        return json({ ok: true, action, data: rows[0]?.data ?? null }, 200, cors.headers);
      }

      case 'windows': {
        const windowRows = body.rows;
        if (!Array.isArray(windowRows)) {
          return fail('invalid_body', 400, cors.headers, { field: 'rows' });
        }
        // Same trap as `settings`, and worse for an array: interpolated directly,
        // postgres.js would bind a Postgres ARRAY rather than json.
        const rows = await sql<{ data: unknown }[]>`
          select porca.admin_windows(${sql.json(windowRows)}::jsonb) as data
        `;
        return json({ ok: true, action, data: rows[0]?.data ?? null }, 200, cors.headers);
      }

      // No default that acts: anything unrecognised is refused outright.
      default:
        return fail('unknown_action', 400, cors.headers);
    }
  } catch (error) {
    console.error(`[${LABEL}] ${describeError(error)}`);
    return fail('server_error', 500, cors.headers);
  }
});
