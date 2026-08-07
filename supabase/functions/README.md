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

**One-off closures are per date and can be per service.** `porca.closures` keys
on the date and carries a `band`: `null` shuts the whole day, `'pranzo'` or
`'cena'` shuts one service and leaves the other bookable. That matters here and
not upstream, because Saturday and Sunday run two services — "chiuso a pranzo,
aperto a cena" would otherwise cost the owner the whole day's dinner covers. The
band is matched against `service_windows.service` / `bookings.service`, not
against a clock time, so moving the hours from the console cannot change what a
closure means.

**The 120-minute turn overruns closing by 30 minutes at both services** (13:00 +
120' = 15:00 against a 14:30 lunch close; 21:30 + 120' = 23:30 against 23:00).
Nothing is overbooked by it — capacity only ever compares bookings with each
other — but the house does seat a 5+ top that sits past closing. Left as seeded;
it is the owner's call. See the OPEN QUESTION note on `porca.settings` in the
migration.

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
| `TURNSTILE_SECRET` | **NO — must stay unset** | book | CAPTCHA off, which is the intended state (see Turnstile below) |
| `RESEND_API_KEY` | yes | book, cancel | guest confirmation + owner e-mail skipped |
| `PORCA_NOTIFY_EMAIL` | yes | book, cancel | owner e-mail skipped silently |
| `PORCA_IP_SALT` | **yes in prod** | all | rate-limit keys are unsalted + warning |
| `PORCA_MAIL_FROM` | **yes in prod** | book, cancel | falls back to the `onboarding@resend.dev` sandbox, which only delivers to the Resend account owner |
| `PORCA_SITE_URL` | yes at go-live | book | cancel links point at the GitHub Pages preview |
| `PORCA_ALLOWED_ORIGINS` | optional | all | only the built-in origins (Pages, the two porcaporchetta.it hosts, the Netlify host, local dev ports) are allowed |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_DB_URL` are injected by the
platform — do not set them by hand.

### Turnstile: OFF, on purpose — do not set `TURNSTILE_SECRET`

This is a decision, not an omission. The site's design value is **zero
third-party requests**, so `prenota.html` never loads
`challenges.cloudflare.com/turnstile/v0/api.js`. `window.turnstile` is therefore
always undefined, `js/booking-config.js` carries an empty `turnstileSiteKey`, and
the widget always posts `token: ""`.

Server-side the check is fail-closed. So **setting `TURNSTILE_SECRET` on its own
breaks 100% of bookings**: every request arrives with an empty token, and
`porca-book` answers `403 captcha_failed` to every guest. There is no partial
failure mode and nothing in the UI would explain it.

The bot defence in its place is the per-IP rate limit — 5 bookings/hour and
20/24h on a salted IP hash — plus the honeypot field. That is what
`PORCA_IP_SALT` is protecting; treat it as the required secret, not this one.

If Turnstile is ever genuinely wanted, the order is fixed and cannot be reversed:

1. add the Cloudflare script tag to `prenota.html` and set `turnstileSiteKey` in
   `js/booking-config.js`,
2. deploy the site and confirm in DevTools that a real token is being posted,
3. **only then** `supabase secrets set TURNSTILE_SECRET=…`.

Do step 3 first and the site stops taking bookings the moment the secret lands.
`porca-book` logs a loud, explicit error naming both client-side prerequisites if
it ever sees a set secret and an empty token — if you see it, unset the secret to
restore service immediately.

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

`supabase/migrations/` holds **two real files and ten comment-only placeholders**:

| File | What it is |
|---|---|
| `20260806120000_porca.sql` | **the engine** — schema, tables, functions, seed, GDPR cron, lockdown |
| `20260806121000_seed_admin.sql` | seeds `porca.admins` from the owner's auth user |
| `0001_remote_placeholder.sql` | placeholder |
| `20260806000000_remote_placeholder.sql` | placeholder |
| `20260806001000_remote_placeholder.sql` | placeholder |
| `20260806140000_remote_placeholder.sql` | placeholder |
| `20260806150000_remote_placeholder.sql` | placeholder |
| `20260806160000_remote_placeholder.sql` | placeholder |
| `20260806170000_remote_placeholder.sql` | placeholder |
| `20260806180000_remote_placeholder.sql` | placeholder |
| `20260806190000_remote_placeholder.sql` | placeholder |
| `20260807000000_remote_placeholder.sql` | placeholder |
| `20260807010000_remote_placeholder.sql` | placeholder |

The placeholders exist because, **for the preview only**, this schema is hosted on
a Supabase project shared with other tenants. Their migration versions are already
recorded in `supabase_migrations.schema_migrations`, and without a local file of
the same version the CLI reports the histories as divergent. The placeholders are
never executed and contain no SQL. **Do not renumber or rename any migration
file** — the numbering is what lines this repo up with that shared ledger.

This is temporary. At handover Porca Porchetta moves to its own Supabase project
under the owner's account, at which point every `*_remote_placeholder.sql` file
should be **deleted** — on a dedicated project the ledger starts empty and the two
real migrations are the whole history. `--include-all` stops being necessary then
too.

```bash
supabase db push --include-all --project-ref <REF>
```

`--include-all` is **required**, not optional. Both real files sort *below* the
remote head (`20260807010000…`), and without the flag the CLI skips everything
older than the last applied version — i.e. it would apply nothing at all and
report success.

Watch the output for `NOTICE` lines: the engine schedules its own nightly
`porca.gdpr_purge()` through pg_cron and says so, or says why it could not (see
GDPR below).

`20260806121000_seed_admin.sql` selects from `auth.users` by e-mail. Create the
owner account (`Porcaporchetta2025@gmail.com`) in the Supabase dashboard first,
or the insert quietly seeds zero rows and the console will 403 for everyone.

Pre-flight checklist:

1. `deno task check` (from `supabase/functions/`) — type-checks all four entry points.
2. `supabase db push --include-all`, then run the eight self-check queries in the
   footer of `20260806120000_porca.sql` (grants, schema privileges, function
   privileges, DST offsets, the 8 seeded windows, the `porca:` lock namespace, the
   named CHECK constraints, and the `porca-gdpr-purge` cron job).
3. Secrets set: `PORCA_IP_SALT` and `PORCA_MAIL_FROM` above all.
   **`TURNSTILE_SECRET` must stay unset** — setting it breaks every booking, see
   the Turnstile section above.
4. Production origin added to `PORCA_ALLOWED_ORIGINS` before the domain goes live,
   and `PORCA_SITE_URL` switched off the Pages preview at the same time.
5. Resend sender verified for whatever `PORCA_MAIL_FROM` points at. Until then the
   sandbox sender only reaches the Resend account owner.
6. Smoke test: availability → book → guest confirmation arrives → owner notice
   arrives → cancel from the link in the mail.

Local: `supabase functions serve --no-verify-jwt`, with the same names in
`supabase/.env.local`.

## Endpoints

All endpoints are `POST`, all responses are JSON, all errors carry an Italian
`message`. CORS is an allowlist: `https://xerocool36.github.io`,
`https://porcaporchetta.it`, `https://www.porcaporchetta.it`,
`https://porca-porchetta.netlify.app`, plus `localhost` and `127.0.0.1` on ports
3000, 4321, 5173 and 8080, plus anything in `PORCA_ALLOWED_ORIGINS`. Never `*`.

An unlisted origin gets exactly one thing from every endpoint: a
`403 origin_not_allowed` with a fixed Italian message, refused before the
database is touched. That refusal **does** carry `Access-Control-Allow-Origin`
echoing the caller, and the preflight answers 204 so the browser gets far enough
to read it — otherwise a missing entry in `PORCA_ALLOWED_ORIGINS` shows up on the
site as "Connessione assente" and is impossible to diagnose from the field.
Nothing else is ever served to an unlisted origin; `cors.headers` stays empty on
a rejection so a forgotten check still fails safe. See `_shared/cors.ts`.

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
      "note": null, "closed_band": null, "services": [] },
    { "date": "2026-08-11", "dow": 2, "closed": false, "utc_offset": "+02:00",
      "note": null, "closed_band": null,
      "services": [ { "service": "cena", "slots": [ { "time": "19:30", "ok": true } ] } ] },
    { "date": "2026-08-15", "dow": 6, "closed": false, "utc_offset": "+02:00",
      "note": "Sagra in piazza", "closed_band": "pranzo",
      "services": [ { "service": "cena", "slots": [ { "time": "19:30", "ok": true } ] } ] }
  ]
}
```

`closed_band` is the half-day closure: `null` means nothing is specially shut
(`closed` alone tells you whether the whole day is), `"pranzo"` or `"cena"` means
that one service is closed and only the other appears in `services`. When the
shut service is the only one that weekday runs — `"cena"` on a Tuesday — the
database reports `closed: true` with `services: []` instead, so a caller that
ignores `closed_band` still never offers a day nothing can be booked on.

`utc_offset` is per day, because a 30-day horizon can cross a DST change: build
the instant as `"<date>T<time>:00<utc_offset>"`, never `new Date("2026-08-11 19:30")`.

`Cache-Control: public, max-age=20`. Rate limit 120/hour and 600/day per IP → `429`.
On failure: `{ "ok": false, "error": "server_error", "message": "…" }` — a
successful response has no `ok` field, so branch on `days`.

### `POST /porca-book`

```jsonc
{
  "party": 4,                    // int, required. The cap is porca.settings.max_party
                                 // (8 today); the Edge only rejects > 40
  "date": "2026-08-15",          // YYYY-MM-DD, required
  "time": "20:00",               // HH:MM, required
  "name": "Mario Rossi",         // 2..80
  "phone": "+39 333 123 4567",   // required, <= 32 chars. The 8-digit floor is the
                                 // database's; the Edge only rejects "no digits"
  "email": "mario@example.com",  // REQUIRED, <= 120 — it is the booking receipt
  "notes": "tavolo in grotta",   // optional, <= 400
  "consent": true,               // must be exactly true
  "token": "",                   // Turnstile is OFF here — always send "" (see above)
  "pp_note_2": ""                // honeypot: hidden field, must stay empty
}
```

**Thresholds live in the database.** `party` and the phone floor are checked
against `porca.settings` inside `porca.book()`, which formats the Italian
message from the live value — so raising `max_party` from the console takes
effect immediately, with no redeploy. The Edge Function only enforces the
column's own outer bounds (`party` 1..40, phone must contain at least one digit)
so that absurd input never costs a database round-trip. Never mirror a setting
in TypeScript: an Edge-side copy silently overrides whatever the owner sets.

**Honeypot field name.** `pp_note_2` is the current name. `company` is still
accepted for the handover but is being retired — it matches the browser autofill
token `organization`, so a real guest's autofill could fill it in and get the
decoy answer (`ok:true`, a throwaway code, no table). Do not re-introduce a name
any autofill heuristic recognises.

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
- Parties over `max_party` are refused with `party_too_large` and the message
  tells the guest to phone **06 6549 5256**. That is a landline: **this venue has
  no WhatsApp — never render a WhatsApp link anywhere.** Read the ceiling from
  `max_party` in the availability payload; do not hard-code 8 in the widget
  either.
- A half-day closure comes back as `closed` with `A pranzo siamo chiusi in questa
  data.` / `A cena siamo chiusi in questa data.` — show the message as given.
- Render the hidden honeypot input off-screen with `autocomplete="off"` and a
  name no autofill heuristic knows (`pp_note_2`). A filled honeypot returns a
  normal-looking `ok:true` with a throwaway `PP-` code and writes nothing — that
  reply is intentionally indistinguishable from a real one, which is exactly why
  a false positive is so damaging.
- Turnstile is off; send `token: ""`. It is fail-closed if it is ever switched on.
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
{ "action": "block",      "date": "2026-08-15", "note": "Sagra", "on": true,
                          "band": "pranzo" }
{ "action": "block",      "date": "2026-08-15", "on": false }
{ "action": "settings",   "patch": { "accepting": false } }
{ "action": "windows",    "rows": [ { "dow": 6, "service": "cena",
                                      "opens": "17:00", "last_seating": "21:30",
                                      "slot_minutes": 30, "active": true } ] }
```

Success: `{ "ok": true, "action": "day", "data": <jsonb from the SQL function> }`.
Unknown action → `400 unknown_action`. There is no default branch that acts.

**`block` — `band` is optional.** Omitted, `null` or `""` all mean *the whole
day*, so the three-field call above keeps working exactly as before. `"pranzo"`
or `"cena"` closes that one service and leaves the other bookable — which this
venue needs, because Saturday and Sunday run two services.

- `on: false` reopens the date completely and ignores `band`; there is one
  closures row per date, so "reopen" can only mean "fully open again". To swap
  which half is shut, close it again with the other band. To close the rest of
  the day too, close it again with no band.
- `data.band` comes back on every response, and `data.warning` counts only the
  bookings **the closed band** holds, not the whole day.
- `400 invalid_body {field:"band"}` for anything other than `pranzo` / `cena` /
  empty. The SQL layer additionally answers `band_not_applicable` if that weekday
  runs a single continuous `giornata` window — one service cannot be half shut by
  a service name, and the closure is refused rather than silently doing nothing.
  Nothing seeds `giornata`, so this cannot fire as configured today.
- `admin_day` and the public availability payload both carry `closed_band`, so
  the console can list a half-closed date. Note that a banded closure leaves
  `closed: false` on a day that still has its other service — a console that
  lists closures by filtering on `closed` alone will not show it.

`windows` replaces the **whole** weekly template in one transaction. To close a
day, omit every row for that dow. Sending an empty array closes the venue on
every day of the week and comes back with a `warning` saying so.

`set_status` can also answer `date_closed`: re-confirming a cancelled booking
onto a date (or a service) the owner has since closed is refused, because it
would seat a table in a room nobody is staffing. Reopen the date first.

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
- **Capacity and every other policy threshold.** Never computed in TypeScript.
  `porca.book()` takes an advisory transaction lock on the service date *before*
  reading occupancy, then applies the peak-covers check. `MAX_PARTY_ONLINE = 40`
  and `MIN_PHONE_DIGITS = 1` in `porca-book/index.ts` are the column's own outer
  bounds, deliberately **not** copies of `porca.settings.max_party` or of the
  8-digit phone floor: an Edge-side copy refuses before the database is consulted,
  so changing the setting in the console would appear to do nothing. Same rule for
  the Italian strings — `MESSAGES.party_too_large` and `MESSAGES.invalid_phone`
  quote no number, because `porca.book()` builds the real sentence from the live
  setting and `porca-book` returns that message verbatim.
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
- **GDPR.** `porca.gdpr_purge()` anonymises bookings older than 120 days, and the
  migration now **schedules it itself** through pg_cron as job
  `porca-gdpr-purge`, daily at 04:40 UTC. That is not housekeeping: `privacy.html`
  tells visitors the anonymisation happens *automatically*, and an unscheduled
  function makes that statement false on a live public site.
  The scheduling is guarded so a project without pg_cron still applies the
  migration — it degrades to a `NOTICE`. **Read the `db push` output.** If the
  job was not scheduled, either enable pg_cron (Dashboard → Database →
  Extensions) and re-run the block, or have the 120-day claim in `privacy.html`
  softened. Verify with self-check 8 in the migration footer:
  `select jobname, schedule, active from cron.job where jobname = 'porca-gdpr-purge';`
