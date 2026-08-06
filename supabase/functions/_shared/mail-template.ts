/**
 * mail-template — one house style for every e-mail the site sends.
 *
 * Ported from the x3ro house mail template, repainted in Porca Porchetta's
 * tufo/cave palette. Both porca-book (guest confirmation + owner notice) and porca-cancel
 * (owner notice) go through `mailShell()`, so the fraschetta never speaks in
 * three different voices.
 *
 * Deliberately old-fashioned HTML — nested tables, inline styles, no <style>
 * block, no web fonts, no images. Outlook strips or ignores all three, and a
 * confirmation that arrives unstyled at 8pm on a phone is worse than a plain
 * one. Every mail also ships a text/plain part built by the caller.
 *
 * NOTE: this file is an addition to the three shared helpers (cors/db/util).
 * It exists so porca-book and porca-cancel do not each carry a private copy of
 * ~100 lines of table markup. Everything guest-supplied still passes through
 * escapeHtml() before it reaches the markup.
 */

import { escapeHtml } from './util.ts';

/* Tufo / cave palette. Warm stone paper, dark ink, wine-red accent. */
const PAPER_BG = '#F3EDE3';
const CARD_BG = '#FBF7EF';
const INK = '#1C1613';
const INK_SOFT = '#57493C';
const INK_DIM = '#7A6A57';
const WINE = '#8E2230';
const WINE_MID = '#A8394A';
const HAIRLINE = '#DFD2BE';

const SERIF = "Georgia,'Iowan Old Style','Times New Roman',serif";
const SANS = 'Helvetica,Arial,sans-serif';

export const VENUE_NAME = 'Porca Porchetta';
export const VENUE_ADDRESS = 'Via del Trivio 31, 00061 Anguillara Sabazia (RM)';
/** Landline. There is NO WhatsApp for this venue — never link one. */
export const VENUE_PHONE = '06 6549 5256';
export const VENUE_PHONE_HREF = '+390665495256';
/** Closing line on every guest-facing mail. */
export const SIGN_OFF = '— Porca Porchetta, Anguillara';

/** One label/value line in the detail block. `value` may contain safe markup. */
export interface MailRow {
  label: string;
  /** Already escaped or intentionally trusted markup. */
  value: string;
}

export interface MailShellInput {
  /** Small caps line above the title, e.g. "Prenotazione confermata". */
  eyebrow: string;
  /** Serif headline. */
  title: string;
  /** Optional lead paragraph, plain text. */
  intro?: string;
  rows?: MailRow[];
  /** Optional single call to action. */
  action?: { label: string; href: string };
  /** Free paragraphs after the details — trusted markup, keep them short. */
  notes?: string[];
  /** Owner-facing mail: drops the address/phone footer and the sign-off. */
  internal?: boolean;
}

function rowsBlock(rows: MailRow[], trailing: boolean): string {
  const cells = rows.map(({ label, value }) => `
          <tr>
            <td style="padding:7px 20px 7px 0;font-family:${SANS};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${INK_DIM};white-space:nowrap;vertical-align:top">${
    escapeHtml(label)
  }</td>
            <td style="padding:7px 0;font-family:${SANS};font-size:15px;color:${INK};vertical-align:top">${value}</td>
          </tr>`).join('');

  return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 ${
    trailing ? '26px' : '0'
  }">${cells}
      </table>`;
}

function actionBlock(action: { label: string; href: string }, trailing: boolean): string {
  const href = escapeHtml(action.href);
  // Bulletproof-ish button: a padded table cell, not a styled <a>, so Outlook
  // renders the fill instead of a bare blue link.
  return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 ${
    trailing ? '26px' : '0'
  }">
        <tr>
          <td style="background:${WINE};padding:13px 26px">
            <a href="${href}" style="font-family:${SANS};font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:${CARD_BG};text-decoration:none;display:inline-block">${
    escapeHtml(action.label)
  }</a>
          </td>
        </tr>
      </table>`;
}

export function mailShell(input: MailShellInput): string {
  const { eyebrow, title, intro, rows, action, notes, internal } = input;

  const footer = internal
    ? `<p style="margin:0;font-family:${SANS};font-size:12px;color:${INK_DIM}">Notifica automatica dal sito ${
      escapeHtml(VENUE_NAME)
    }.</p>`
    : `<p style="margin:0 0 10px;font-family:${SANS};font-size:14px;color:${INK_SOFT};line-height:1.6">
             ${escapeHtml(VENUE_ADDRESS)}<br>
             <a href="tel:${VENUE_PHONE_HREF}" style="color:${WINE};text-decoration:none">${
      escapeHtml(VENUE_PHONE)
    }</a>
           </p>
           <p style="margin:0;font-family:${SANS};font-size:14px;color:${INK_SOFT}">A presto,<br>${
      escapeHtml(SIGN_OFF)
    }</p>`;

  return `<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${
    escapeHtml(title)
  }</title></head>
<body style="margin:0;padding:0;background:${PAPER_BG}">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAPER_BG};padding:28px 14px">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:${CARD_BG};border:1px solid ${HAIRLINE}">

          <tr><td style="padding:26px 32px 20px;border-bottom:1px solid ${HAIRLINE}" align="center">
            <div style="font-family:${SERIF};font-size:23px;letter-spacing:.18em;color:${INK}">PORCA PORCHETTA</div>
            <div style="font-family:${SANS};font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:${INK_DIM};padding-top:7px">Fraschetta · Anguillara Sabazia</div>
          </td></tr>

          <tr><td style="padding:30px 32px 26px">
            <p style="margin:0 0 8px;font-family:${SANS};font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${WINE_MID}">${
    escapeHtml(eyebrow)
  }</p>
            <h1 style="margin:0 0 ${
    intro ? '14px' : '22px'
  };font-family:${SERIF};font-size:27px;font-weight:400;line-height:1.2;color:${INK}">${
    escapeHtml(title)
  }</h1>
            ${
    intro
      ? `<p style="margin:0 0 24px;font-family:${SANS};font-size:15px;line-height:1.6;color:${INK_SOFT}">${
        escapeHtml(intro)
      }</p>`
      : ''
  }
            ${rows && rows.length ? rowsBlock(rows, Boolean(action) || Boolean(notes?.length)) : ''}
            ${action ? actionBlock(action, Boolean(notes?.length)) : ''}
            ${
    (notes ?? []).map((n, i, all) =>
      `<p style="margin:0 0 ${
        i === all.length - 1 ? '0' : '12px'
      };font-family:${SANS};font-size:13px;line-height:1.6;color:${INK_DIM}">${n}</p>`
    ).join('')
  }
          </td></tr>

          <tr><td style="padding:22px 32px 26px;border-top:1px solid ${HAIRLINE}">
            ${footer}
          </td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** `<code>` styling used for booking codes inside a row value. */
export function codeChip(value: string): string {
  return `<span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;letter-spacing:.08em;color:${WINE}">${
    escapeHtml(value)
  }</span>`;
}

/** Inline link in the house colour. */
export function mailLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${WINE};text-decoration:underline">${
    escapeHtml(label)
  }</a>`;
}

/** House accent, for the few inline links built outside this file. */
export const MAIL_ACCENT = WINE;
