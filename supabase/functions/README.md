# Porca Porchetta — Supabase Edge Functions

Reservation backend for **Porca Porchetta**, fraschetta in a tufo cave at
Via del Trivio 31, 00061 Anguillara Sabazia (RM). Timezone `Europe/Rome`,
**60 coperti**, no overbooking — capacity is decided inside the database, never
here. Guest-facing copy is Italian only.

```
_shared/cors.ts           origin allowlist + preflight
_shared/db.ts             postgres.js singleton (direct Postgres, NOT PostgREST)
_shared/util.ts           json(), clientIp(), sha256Hex(), Italian error messages, Resend
_shared/mail-template.ts  mailShell() — the one house style for every e-mail
porca-availability/       public  — slot map for the widget
porca-book/               public  — creates a reservation (security-critical)
porca-cancel/             public  — guest self-service cancellation
porca-admin/              private — back office, auth enforced in code
```

There is no events endpoint: this venue has no events flow yet.

## Opening hours as the database sees them

`porca.service_windows` is the weekly template, all times Rome local. Last
seating on every window is pulled back so a 90-minute turn ends exactly at
closing.

| dow | Giorno | Servizio | Apre | Ultimo turno | Chiude |
|---|---|---|---|---|---|
| 1 | Lunedì | — | — | — | **CHIUSO** |
| 2–5 | Martedì–Venerdì | cena | 17:00 | 21:30 | 23:00 |
| 6, 0 | Sabato, Domenica | pranzo | 11:30 | 13:00 | 14:30 |
| 6, 0 | Sabato, Domenica | cena | 17:00 | 21:30 | 23:00 |

**Monday is closed by having no row at all.** Both `availability()` and `book()`
read "no active window for this dow" as closed. Do not add an inactive Monday
row for symmetry — the missing row is the documented convention.

`service` also accepts `'giornata'` everywhere even though nothing seeds it, so
the owner can collapse the day into one continuous window later from the console
without a migration.

## Why there is no supabase-js data access

This is a **shared** Supabase project holding other clients' data. Everything for
Porca Porchetta lives in schema `porca`, `anon` / `authenticated` have zero
privileges there, and `porca` is deliberately **not** in the PostgREST
exposed-schemas list. So the functions open a direct Postgres connection with
`postgres.js` and call the `porca.*` functions by name. `supabase-js` appears
only in `porca-admin`, only to verify the caller's JWT.

Connection string: `PORCA_DB_URL` if set (use this to pin the transaction
pooler), otherwise the platform-injected `SUPABASE_DB_URL`. `prepare: false` is
required behind the pooler.

**Tenant namespace.** Every advisory lock in the SQL hashes `'porca:' || <date>`.
On a shared database that prefix is what stops one restaurant serialising
against another. Never reuse another tenant's prefix.

## Secrets

Names only — never commit a value, never print one in a log.

```bash
supabase secrets set PORCA_DB_URL="postgres://USER:PASSWORD@HOST:6543/postgres"
supabase secrets set TURNSTILE_SECRET="0x0000000000000000000000000000000000000000"
supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxx"
supabase secrets set PORCA_NOTIFY_EMAIL="Porcaporchetta2025@gmail.com"
supabase secrets set PORCA_IP_SALT="<32+ random chars, e.g. openssl rand -hex 24>"
supabase secrets set PORCA_MAIL_FROM="Porca Porchetta <prenotazioni@porcaporchetta.it>"
supabase secrets set PORCA_SITE_URL="https://porcaporchetta.it"
supabase secrets set PORCA_ALLOWED_ORIGINS="https://porcaporchetta.it,https://www.porcaporchetta.it"
```

| Name | Required | Used by | If missing |
|---|---|---|---|
| `PORCA_DB_URL` | optional | all | falls back to `SUPABASE_DB_URL` |
| `SUPABASE_DB_URL` | injected | all | function returns `server_error` |
| `SUPABASE_URL` | injected | admin | admin returns `server_error` |
| `SUPABASE_ANON_KEY` | injected | admin | admin returns `server_error` |
| `TURNSTILE_SECRET` | **yes in prod** | book | CAPTCHA skipped + loud log warning |
| `RESEND_API_KEY` | yes | book, cancel | guest confirmation + owner e-mail skipped |
| `PORCA_NOTIFY_EMAIL` | yes | book, cancel | owner e-mail skipped silently |
| `PORCA_IP_SALT` | **yes in prod** | all | rate-limit keys are unsalted + warning |
| `PORCA_MAIL_FROM` | **yes in prod** | book, cancel | falls back to the `onboarding@resend.dev` sandbox, which only delivers to the Resend account owner |
| `PORCA_SITE_URL` | yes at go-live | book | cancel links point at the GitHub Pages preview |
| `PORCA_ALLOWED_ORIGINS` | optional | all | only the built-in origins (Pages, the two porcaporchetta.it hosts, the Netlify host, local dev ports) are allowed |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_DB_URL` are injected by the
platform — do not set them by hand.

## Deploy

`verify_jwt` must be **false** for all four functions: the three public ones are
called by anonymous visitors, and `porca-admin` does its own, stricter check in
code. This is already declared in `supabase/config.toml`:

```toml
[functions.porca-availability]
verify_jwt = false
[functions.porca-book]
verify_jwt = false
[functions.porca-cancel]
verify_jwt = false
[functions.porca-admin]
verify_jwt = false
```

```bash
supabase functions deploy porca-availability --project-ref <REF>
supabase functions deploy porca-book         --project-ref <REF>
supabase functions deploy porca-cancel       --project-ref <REF>
supabase functions deploy porca-admin        --project-ref <REF>
```

### Migrations

`supabase/migrations/` holds two real files and three comment-only placeholders:

| File | What it is |
|---|---|
| `0001_remote_placeholder.sql` | stub for another tenant's engine migration already in the shared ledger |
| `20260806000000_remote_placeholder.sql` | stub for another tenant's engine migration already in the ledger |
| `20260806001000_remote_placeholder.sql` | stub for another tenant's admin bootstrap already in the ledger |
| `20260806120000_porca.sql` | **the engine** — schema, tables, functions, seed, lockdown |
| `20260806121000_seed_admin.sql` | seeds `porca.admins` from the owner's auth user |

The placeholders exist because this Supabase project is shared: those versions
are already recorded in `supabase_migrations.schema_migrations` from the other
tenants' repos, and without a local file of the same version the CLI reports the
histories as divergent. They are never executed and contain no SQL.

`20260806121000_seed_admin.sql` selects from `auth.users` by e-mail. Create the
owner account (`Porcaporchetta2025@gmail.com`) in the Supabase dashboard first,
or the insert quietly seeds zero rows and the console will 403 for everyone.

Pre-flight checklist:

1. `deno task check` (from `supabase/functions/`) — type-checks all four entry points.
2. Migration applied, then run the six self-check queries in the footer of
   `20260806120000_porca.sql` (grants, schema privileges, function privileges,
   DST offsets, the 8 seeded windows, the `porca:` lock namespace).
3. Secrets set, above all `TURNSTILE_SECRET`, `PORCA_IP_SALT` and `PORCA_MAIL_FROM`.
4. Production origin added to `PORCA_ALLOWED_ORIGINS` before the domain goes live,
   and `PORCA_SITE_URL` switched off the Pages preview at the same time.
5. Resend sender verified for whatever `PORCA_MAIL_FROM` points at. Until then the
   sandbox sender only reaches the Resend account owner.
6. Smoke test: availability → book → guest confirmation arrives → owner notice
   arrives → cancel from the link in the mail.

Local: `supabase functions serve --no-verify-jwt`, with the same names in
`supabase/.env.local`. Without `TURNSTILE_SECRET` the CAPTCHA step is skipped and
says so in the log on every request.

## Endpoints

All endpoints are `POST`, all responses are JSON, all errors carry an Italian
`message`. CORS is an allowlist: `https://xerocool36.github.io`,
`https://porcaporchetta.it`, `https://www.porcaporchetta.it`,
`https://porca-porchetta.netlify.app`, plus `localhost` and `127.0.0.1` on ports
3000, 4321, 5173 and 8080, plus anything in `PORCA_ALLOWED_ORIGINS`. An unlisted
origin gets a bare 403 with no CORS headers. Never `*`.

### `POST /porca-availability`

```jsonc
// request — every field optional
{ "party": 4, "from": "2026-08-08", "to": "2026-08-21" }
```

`party` is clamped to 1..10 (default 2), `from` defaults to today in Rome, `to`
to `from + 13 days`, and the window is capped at `from + 30`.

The response is the `porca.availability()` payload **with occupancy stripped** —
the per-slot `remaining` seat count never leaves the server:

```jsonc
{
  "rome_now": "2026-08-08T18:22:41+02:00",
  "rome_today": "2026-08-08",
  "capacity": 60, "max_party": 8, "accepting": true, "turn_minutes": 90, "party": 4,
  "days": [
    { "date": "2026-08-10", "dow": 1, "closed": true, "utc_offset": "+02:00",
      "note": null, "services": [] },
    { "date": "2026-08-11", "dow": 2, "closed": false, "utc_offset": "+02:00",
      "note": null,
      "services": [ { "service": "cena", "slots": [ { "time": "19:30", "ok": true } ] } ] }
  ]
}
```

`utc_offset` is per day, because a 30-day horizon can cross a DST change: build
the instant as `"<date>T<time>:00<utc_offset>"`, never `new Date("2026-08-11 19:30")`.

`Cache-Control: public, max-age=20`. Rate limit 120/hour and 600/day per IP → `429`.
On failure: `{ "ok": false, "error": "server_error", "message": "…" }` — a
successful response has no `ok` field, so branch on `days`.

### `POST /porca-book`

```jsonc
{
  "party": 4,                    // int 1..8, required
  "date": "2026-08-15",          // YYYY-MM-DD, required
  "time": "20:00",               // HH:MM, required
  "name": "Mario Rossi",         // 2..80
  "phone": "+39 333 123 4567",   // required, <= 32 chars, >= 8 digits
  "email": "mario@example.com",  // REQUIRED, <= 120 — it is the booking receipt
  "notes": "tavolo in grotta",   // optional, <= 400
  "consent": true,               // must be exactly true
  "token": "<turnstile token>",  // required in production
  "company": ""                  // honeypot: hidden field, must stay empty
}
```

Body cap 8 KB. Success (`200`):

```jsonc
{ "ok": true, "code": "PP-7K3QD", "starts_at": "2026-08-15T18:00:00+02:00",
  "ends_at": "2026-08-15T19:30:00+02:00", "service": "cena", "party": 4,
  "phone_tail": "4567", "emailSent": true }
```

Failure — the Italian `message` comes straight from the database:

| HTTP | `error` |
|---|---|
| 400 | `invalid_body` (with `field`), `consent_required`, `invalid_email`, `invalid_phone`, `not_accepting`, `closed`, `no_such_slot`, `too_late`, `too_far`, `party_too_large` |
| 403 | `captcha_failed`, `origin_not_allowed` |
| 409 | `full`, `duplicate` |
| 413 | `payload_too_large` |
| 429 | `rate_limited` (5/hour and 20/day per IP, `Retry-After` set) |
| 500 | `server_error` |

Notes for the frontend:

- **E-mail and phone are both mandatory.** The confirmation mail is the receipt
  and carries the cancel link; a booking without a valid address is refused
  before it reaches the database.
- Parties over 8 are refused with `party_too_large` and the message tells the
  guest to phone **06 6549 5256**. That is a landline: **this venue has no
  WhatsApp — never render a WhatsApp link anywhere.**
- Render the hidden `company` input off-screen and never autofill it. A filled
  honeypot returns a normal-looking `ok:true` with a throwaway `PP-` code and
  writes nothing — that reply is intentionally indistinguishable from a real one.
- Turnstile failure is fail-closed, including on network timeout.
- `emailSent:false` means the table IS booked but the confirmation did not go
  out. Show the code on screen; never retry the booking.

### `POST /porca-cancel`

```jsonc
{ "code": "PP-7K3QD", "phone_tail": "4567" }
```

`200` → `{ "ok": true, "freed": 4 }`.
`404` → `{ "ok": false, "error": "not_found", "message": "…" }` — identical for an
unknown code and a wrong tail, so existence of a code is never revealed.
`429` after 10/hour or 40/day per IP. `400` `invalid_body` for a malformed code.

The cancel link in the confirmation mail is
`<PORCA_SITE_URL>/prenota.html?annulla=<code>&t=<phone_tail>`. The booking page
must read those two query params and call this endpoint.

### `POST /porca-admin`

Requires `Authorization: Bearer <supabase user JWT>`; the user must pass
`porca.is_admin()`. `401` without a valid token, `403` for a non-admin — nothing
else leaks.

```jsonc
{ "action": "day",        "from": "2026-08-08", "to": "2026-08-14" }
{ "action": "set_status", "id": "<uuid>", "status": "seated" }
{ "action": "block",      "date": "2026-08-15", "note": "Ferragosto", "on": true }
{ "action": "settings",   "patch": { "accepting": false } }
{ "action": "windows",    "rows": [ { "dow": 6, "service": "cena",
                                      "opens": "17:00", "last_seating": "21:30",
                                      "slot_minutes": 30, "active": true } ] }
```

Success: `{ "ok": true, "action": "day", "data": <jsonb from the SQL function> }`.
Unknown action → `400 unknown_action`. There is no default branch that acts.

`windows` replaces the **whole** weekly template in one transaction. To close a
day, omit every row for that dow. Sending an empty array closes the venue on
every day of the week and comes back with a `warning` saying so.

## Conventions worth keeping

- **Rate limiting.** `porca.rate_hit(p_ip_hash, p_max_hour, p_max_day)` returns
  true when the call is ALLOWED. Both numbers are caps — calls in the current
  hour and across a rolling 24 hours; there is no window argument, the function
  buckets hourly and sums the last 24 buckets. Availability 120/600, book 5/20,
  cancel 10/40. Keep the daily cap above the hourly one or the daily figure
  silently becomes the real limit. The key is `sha256(ip + PORCA_IP_SALT)`;
  availability and cancel prefix a scope so one endpoint cannot exhaust
  another's budget. Raw IPs are never stored or logged — logs carry the first
  12 hex chars of the hash only.
- **Capacity.** Never computed in TypeScript. `porca.book()` takes an advisory
  transaction lock on the service date *before* reading occupancy, then applies
  the peak-covers check. `MAX_PARTY_ONLINE = 8` in `porca-book/index.ts` only
  mirrors `porca.settings.max_party` so an oversized party is refused one layer
  earlier; the database remains the authority.
- **Errors.** A Postgres message never reaches the client. It is logged, and the
  caller gets `{ok:false,error:'server_error'}` with a generic Italian message.
- **Dates.** Anything shown to a human is produced with
  `Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', … })` applied to the
  instant returned by the database. Never slice a timestamp string.
- **E-mail.** One house style, `mailShell()` in `_shared/mail-template.ts`:
  nested tables, inline styles, no web fonts, no images, always with a
  `text/plain` twin. Every guest-supplied value goes through `escapeHtml()`.
  A mail failure can never change a booking outcome.
- **Outbound calls.** Turnstile and Resend both run with a 5 s timeout.
- **Logs.** No secret, no raw IP, no guest name, phone or e-mail. Booking codes
  are logged because the owner needs them for support.
- **GDPR.** `porca.gdpr_purge()` anonymises bookings older than 120 days. It is
  NOT scheduled by the migration; wire it to pg_cron manually once pg_cron is
  enabled (the exact command is in a comment at the end of the migration).
