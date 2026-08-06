/**
 * porca-cancel — guest self-service cancellation.
 *
 * POST { code: string, phone_tail: string }
 *
 * The code alone is not enough: the caller must also know the last digits of the
 * phone number on the booking. That pair is the cancel token the confirmation
 * e-mail carries in its link. A wrong code and a wrong tail produce the exact
 * same `not_found` answer, so the endpoint never confirms that a code exists.
 * Rate-limited at 10/hour and 40/day per IP to block code guessing.
 *
 * Deployed with verify_jwt = false.
 */

import { evaluateCors, preflightResponse } from '../_shared/cors.ts';
import { db } from '../_shared/db.ts';
import { codeChip, mailShell, VENUE_NAME } from '../_shared/mail-template.ts';
import {
  asString,
  clientIp,
  describeError,
  escapeHtml,
  fail,
  ipTag,
  json,
  ownerRecipients,
  rateKey,
  readJsonBody,
  romeDateLabel,
  romeTimeLabel,
  runBackground,
  sendEmail,
} from '../_shared/util.ts';

const LABEL = 'porca-cancel';
const MAX_BODY_BYTES = 2048;

/** Same sender as porca-book — see the note on MAIL_FROM there. */
const MAIL_FROM = Deno.env.get('PORCA_MAIL_FROM') ??
  'Porca Porchetta <onboarding@resend.dev>';

/**
 * Rate limit per hashed IP. porca.rate_hit(ip_hash, max_hour, max_day) — both
 * numbers are caps: calls in the current hour and across a rolling 24 hours.
 * Tight on purpose: this endpoint is the code-guessing surface.
 */
const MAX_PER_HOUR = 10;
const MAX_PER_DAY = 40;

export interface CancelSuccess {
  ok: true;
  freed: number;
}

export interface CancelFailure {
  ok: false;
  error: 'not_found';
}

export type CancelResult = CancelSuccess | CancelFailure;

interface CancelInput {
  code: string;
  phoneTail: string;
}

function validate(body: Record<string, unknown>): CancelInput | null {
  const code = asString(body.code);
  if (code.length < 4 || code.length > 32 || !/^[A-Za-z0-9-]+$/.test(code)) return null;

  const phoneTail = asString(body.phone_tail).replace(/\D/g, '');
  if (phoneTail.length < 2 || phoneTail.length > 8) return null;

  return { code, phoneTail };
}

function buildOwnerEmail(code: string, freed: number) {
  const now = new Date();
  const when = `${romeDateLabel(now)} alle ${romeTimeLabel(now)}`;

  return {
    subject: `Prenotazione annullata · ${code} · ${freed} coperti liberati`,
    text: [
      `PRENOTAZIONE ANNULLATA — ${VENUE_NAME}`,
      '',
      `Codice:            ${code}`,
      `Coperti liberati:  ${freed}`,
      `Annullata il:      ${when}`,
      '',
      "L'annullamento è stato fatto dal cliente dal sito.",
    ].join('\n'),
    html: mailShell({
      internal: true,
      eyebrow: 'Prenotazione annullata',
      title: `${freed} ${freed === 1 ? 'coperto tornato' : 'coperti tornati'} liberi`,
      rows: [
        { label: 'Codice', value: codeChip(code) },
        { label: 'Annullata il', value: escapeHtml(when) },
      ],
      notes: ['Annullamento effettuato dal cliente dal sito.'],
    }),
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = evaluateCors(req);
  if (req.method === 'OPTIONS') return preflightResponse(cors);
  if (cors.rejected) return fail('origin_not_allowed', 403);
  if (req.method !== 'POST') return fail('method_not_allowed', 405, cors.headers);

  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if (!parsed.ok) {
    return fail(parsed.slug, parsed.slug === 'payload_too_large' ? 413 : 400, cors.headers);
  }

  const input = validate(parsed.body);
  if (!input) return fail('invalid_body', 400, cors.headers);

  try {
    const sql = db();
    const key = await rateKey(clientIp(req), 'cancel');

    const gate = await sql<{ allowed: boolean }[]>`
      select porca.rate_hit(${key}::text, ${MAX_PER_HOUR}::int, ${MAX_PER_DAY}::int) as allowed
    `;
    if (gate[0]?.allowed !== true) {
      console.warn(`[${LABEL}] rate limited ip=${ipTag(key)}`);
      return fail('rate_limited', 429, { ...cors.headers, 'Retry-After': '600' });
    }

    const rows = await sql<{ result: CancelResult }[]>`
      select porca.cancel(${input.code}::text, ${input.phoneTail}::text) as result
    `;
    const result = rows[0]?.result;
    if (!result) throw new Error('porca.cancel() returned no row');

    if (result.ok === false) {
      // Same answer for an unknown code and a wrong tail.
      console.log(`[${LABEL}] cancel refused ip=${ipTag(key)}`);
      return fail('not_found', 404, cors.headers);
    }

    console.log(`[${LABEL}] cancelled code=${input.code} freed=${result.freed}`);

    // Internal notice only, and never allowed to affect the response.
    const owners = ownerRecipients();
    if (owners.length > 0) {
      runBackground(
        (async () => {
          try {
            await sendEmail({
              from: MAIL_FROM,
              to: owners,
              ...buildOwnerEmail(input.code, result.freed),
            }, LABEL);
          } catch (error) {
            console.error(`[${LABEL}] owner notice failed: ${describeError(error)}`);
          }
        })(),
        LABEL,
      );
    }

    return json({ ok: true, freed: result.freed }, 200, cors.headers);
  } catch (error) {
    console.error(`[${LABEL}] ${describeError(error)}`);
    return fail('server_error', 500, cors.headers);
  }
});
