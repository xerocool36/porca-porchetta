# Porca Porchetta — fraschetta, Anguillara Sabazia

Production site for **Porca Porchetta**, Via del Trivio 31, 00061 Anguillara Sabazia (RM).
Static, no build step, no dependencies, no third-party requests.

- **Landing:** `index.html`
- **Menu (table QR target):** `menu.html`, also served at `/menu`

## Stack

Plain HTML + CSS + vanilla JS. No framework, no CDN, no analytics, no cookies.

Design direction is **"La grotta"** (v3, 2026-08-07). Two colours carry the whole site:
ink, and the **cotto** of their own brick vault. Everything else is warm tufo stone. The
bottle green of their shopfront was the accent until 2026-08-07 and was dropped at the
owner's request — it survives only inside photographs of the shopfront itself, where it is
documentary. Bevan, a heavy Clarendon slab, is the letterform of the painted *insegne* and
enamel plates hanging in their alley; the enamel seal is quoted from those plates.

Two earlier directions were rejected by the owner: v1 "Fraschetta Fumetto" (comic /
illustration) and v2 "Travertino" (neutral grey with a single pomegranate accent).

**Every photograph of this venue is a 3:4 phone portrait and no landscape frame exists.**
The hero is therefore three portraits standing side by side rather than one letterboxed
plate — a single wide hero has to crop a portrait, which is what deleted the painted ROMA
sign in both earlier builds. Anything added later should respect that constraint.

Motion is IntersectionObserver + CSS keyframes only. GSAP and Lenis were deliberately
dropped: the QR menu page has to paint fast on cafe 4G, and smooth-scroll libraries hijack
native touch scrolling. Fonts are self-hosted, so there is no Google Fonts CDN call (GDPR).

Everything degrades: with JS disabled, every price, opening hour and phone number is still
in the HTML and fully readable.

## Content that is verified

Taken from the venue's own published material and cross-checked:

- **Menu and prices** - read off the photographed menu board (taglieri, panini, contorni, caraffe).
- **Hours** - Google Business Profile: Mon closed, Tue-Fri 17:00-23:00, Sat and Sun 11:30-14:30 + 17:00-23:00.
- **Phone** - 06 6549 5256 (landline; no mobile or WhatsApp is published).
- **Address** - Via del Trivio 31-33.
- **Rating** - 4.7 stars / 63 Google reviews at time of build (2026-07-26).

## Known blockers

| What | When it bites | Detail |
|---|---|---|
| **CSP breaks the staff console** | The first Netlify deploy | `netlify.toml` sets `script-src 'self'; style-src 'self'`. `admin.html` is one inline `<style>` plus one inline `<script>`, so both are dropped and the console renders blank. Harmless today (GitHub Pages sends no CSP). Fix before hosting: extract to `css/admin.css` + `js/admin.js`, **or** add an `/admin.html` header block with `'unsafe-inline'` and accept the downgrade. Full note at the top of `netlify.toml`. |
| **Canonical / OG / sitemap URLs** | Domain purchase | They point at the GitHub Pages address. Update in `index.html`, `menu.html`, `prenota.html`, `sitemap.xml`, `robots.txt`. |
| **`noindex` on every page** | Owner sign-off | Deliberate: this is a spec build for a business that has not signed off. Remove `<meta name="robots" content="noindex, nofollow">` when it goes live for real. |
| **Confirmation email** | Domain purchase | Resend is off until the fraschetta owns a domain to send from. |

## Placeholders - to confirm with the client

| Item | Current state |
|---|---|
| **P.IVA** | Footer reads "P.IVA da inserire". Legally required on an Italian business site. |
| **Drinks and dolci** | Beers, wine, soft drinks and Martina's tiramisu are served but have no published prices - the menu says "chiedi in sala" rather than inventing figures. |
| **Delivery** | Google lists delivery, but no partner or radius is published. Not advertised on the site. |
| **Logo** | Traced from a raster export. Ask for the vector original. |
| **Photography** | The venue's own Google Business Profile / Instagram photos. Ask for the original files for production use. |
| **Cookie/privacy notice** | Not needed as built (no cookies, no analytics, no embeds). If analytics or a Maps iframe is ever added, a privacy policy and consent banner become mandatory. |
| **Domain** | Not registered. porcaporchetta.it and .com were both free at time of build. |

localStorage stores exactly one key, `pp-lang` ("it" or "en"), for the language toggle.
It is a preference, not tracking, so no consent banner is required.

## Booking

Self-hosted on the shared x3ro Supabase project, schema `porca`. There is **no** approval
queue and no large-party gate: `porca.settings.max_party` is **20** (raised from 8 on
2026-08-07), so a party of fourteen is an ordinary capacity question that `porca.book()`
answers like any other. The widget renders chips 1–8 and hands anything larger to a native
picker; it reads the cap from the server, so changing it in the staff console's
*Impostazioni* changes the page with no redeploy.

## Deploy

Currently on **GitHub Pages** (project site), served from the repo root on `main`:
<https://xerocool36.github.io/porca-porchetta/>

`.nojekyll` is present so Pages serves the files as-is. Note that Pages cannot apply
custom headers, so the CSP and security headers in `netlify.toml` are inert there — they
take effect only if the site moves to Netlify.

Canonical, OG and sitemap URLs currently point at the Pages address so link previews
resolve. **When a real domain is bought, update those URLs** in `index.html`, `menu.html`,
`sitemap.xml` and `robots.txt`.

### If moving to Netlify
Publish directory `.` - `netlify.toml` carries the security headers, cache policy and the
`/menu` redirect.

Stage from a clean directory (never deploy `--dir .` straight from the working tree) and
pass the site **ID**, not the name - deploying an unlinked directory by name silently
creates a second site:

    mkdir -p /tmp/pp-deploy
    git archive HEAD | tar -x -C /tmp/pp-deploy
    netlify deploy --prod --dir /tmp/pp-deploy --site <SITE_ID>

## Local preview

    npx serve .

Use `npx serve` rather than python's http.server: the latter does not honour Range
requests, which matters if video is ever added.

## Checks before any redeploy

- Prices and hours still match the board and the Google listing.
- `tel:` dials, and the Maps link resolves to Via del Trivio 31.
- IT / EN toggle leaves no untranslated strings.
- Reduced motion: page fully composed and readable with zero animation.
- Keyboard only: every control focusable, tris playable.
- No horizontal scroll at 390px on **every** page, `admin.html` included. Two separate
  min-content blowouts have already shipped here (a grid item and a `<fieldset>`, both
  defaulting to `min-width: auto` around the 14-chip date strip).
