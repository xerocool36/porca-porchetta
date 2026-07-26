# Porca Porchetta — fraschetta, Anguillara Sabazia

Production site for **Porca Porchetta**, Via del Trivio 31, 00061 Anguillara Sabazia (RM).
Static, no build step, no dependencies, no third-party requests.

- **Landing:** `index.html`
- **Menu (table QR target):** `menu.html`, also served at `/menu`

## Stack

Plain HTML + CSS + vanilla JS. No framework, no CDN, no analytics, no cookies.

Design direction is **"Fraschetta Fumetto"** — a comic book set inside their tufo cave.
Palette and type derive from the venue's own artefacts: colours sampled from their printed
menu board and logo, arch shapes from the cave vaults, neon from the wall signs, the
tic-tac-toe game from their paper placemats.

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

## Deploy

Netlify, publish directory `.` - `netlify.toml` carries the security headers, cache policy
and the `/menu` redirect.

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
