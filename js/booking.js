/* Porca Porchetta — prenotazioni
 * ---------------------------------------------------------------------------
 * Vanilla JS, no dependencies, no build step. Talks to three Supabase Edge
 * Functions: porca-availability, porca-book, porca-cancel.
 *
 * MOUNT — the dedicated page is prenota.html
 *   <div id="porca-prenota"></div>
 *   <script defer src="js/booking-config.js"></script>   // PORCA_BOOKING_CONFIG
 *   <script defer src="js/booking.js"></script>
 *
 *   With functionsUrl or anonKey missing — or with the anonKey still on its
 *   PASTE_ placeholder — the widget renders the phone card instead of a broken
 *   form. That is the correct pre-backend state, not a failure.
 *
 * WHY THE ANON KEY IS IN THE PAGE
 *   The booking schema is not exposed to PostgREST and the anon role holds no
 *   privileges on it. The key is a public, revocable project identifier; every
 *   real check lives in the Edge Functions and in Postgres.
 *
 * OCCUPANCY IS PRIVATE
 *   porca-availability sends { time, ok } per slot and nothing else. The house
 *   never tells a guest how many seats are left — a slot is bookable, or it is
 *   "esaurito". Do not reintroduce a seat count here even if one turns up in
 *   the payload.
 *
 * TIMEZONE CONTRACT — the reason this file is careful:
 *   The fraschetta's clock is Europe/Rome. The visitor's clock is irrelevant and
 *   must never leak into a calculation.
 *     1. `new Date("2026-08-09 20:00")` is FORBIDDEN: that form parses in the
 *        browser's own zone, so a guest in Tokyo would book a different instant
 *        than the one they tapped. Every instant here is built from the explicit
 *        per-day offset the server sends: "2026-08-09T20:00:00+02:00".
 *     2. Calendar labels come from a UTC-midnight Date formatted with
 *        timeZone:'UTC', so "sabato 9 agosto" reads the same everywhere.
 *   "Today" is whatever the server says. The browser clock is never consulted.
 *
 * MARKUP
 *   Everything server-derived goes in through textContent on nodes built with
 *   document.createElement. There is no innerHTML in this file, so a note, a
 *   name or an error message coming back from the API cannot become markup.
 *   Classes come from css/style.css — this widget owns no stylesheet.
 *
 * ITALIAN ONLY — the booking flow is not translated. The IT/EN toggle is left
 *   off prenota.html on purpose; a half-translated form is worse than one
 *   honest language.
 */
(function () {
  'use strict';

  var CFG = window.PORCA_BOOKING_CONFIG || {};
  var API = (CFG.functionsUrl || '').replace(/\/$/, '');
  var ANON = CFG.anonKey || '';
  var PRIVACY = CFG.privacyUrl || '';          // '' = no privacy page yet
  var ROME = 'Europe/Rome';

  // Both of these are PRE-RESPONSE DEFAULTS ONLY. The database owns the real
  // numbers — porca.settings.horizon_days and porca.settings.max_party — and the
  // moment porca-availability answers, its values win, upward as well as
  // downward. A client-side clamp here would mean raising max_party to 10 in the
  // admin console changed nothing on the page, which is the sort of silent
  // no-op nobody ever debugs.
  var DAYS_SHOWN = 14;                          // date strip length, until told
  var MAX_PARTY = 20;                           // pre-response default only
  // Above this the row stops being chips and becomes a native picker. Twenty
  // chips is four rows of tapping on a phone to answer "how many of you";
  // eight covers almost every booking and the rest is one OS wheel.
  var CHIP_PARTY_MAX = 8;
  var MIN_FILL_MS = 1500;                       // no human fills this form faster
  var HP_FIELD = 'pp_note_2';                   // honeypot: see the note at fs4
  var TEL_HREF = '+390665495256';
  var TEL_TEXT = '06 6549 5256';

  var root = document.getElementById('porca-prenota');
  if (!root) return;

  // The live summary lives in the page, in its own sticky column, so it is
  // never inside the part of the DOM this widget throws away and rebuilds.
  var RIEP = document.getElementById('pp-riepilogo');

  /* ------------------------------------------------------------ copy (IT) */

  var T = {
    date: 'Che giorno',
    slot: 'A che ora',
    people: 'Quante persone',
    you: 'I tuoi dati',
    service: 'Servizio',
    // Large tables book online like every other table. The picker's label is
    // split so it always states the number porca.settings.max_party says today.
    party_more_chip: 'Di più',
    party_more_label: 'Quante persone, fino a',
    party_more_unit: 'persone',
    full: 'esaurito',
    closed: 'chiuso',
    closed_day: 'Chiusi in questa data.',
    no_slots: 'Nessun orario disponibile per questo giorno.',
    name: 'Nome e cognome',
    email: 'Email',
    phone: 'Telefono',
    notes: 'Note (allergie, seggiolone, occasione)',
    notes_hint: 'Facoltative. Se ci sono allergie o intolleranze, scrivicele qui.',
    consent_plain: 'Acconsento al trattamento dei miei dati per gestire questa prenotazione.',
    consent_pre: 'Ho letto la ',
    consent_link: 'privacy policy',
    consent_post: ' e acconsento al trattamento dei dati per questa prenotazione.',
    submit: 'Conferma la prenotazione',
    sending: 'Un attimo…',
    loading: 'Carico le disponibilità…',
    rome_note: 'Tutti gli orari sono ora di Roma.',
    your_time: 'da te',
    done_k: 'Prenotazione confermata',
    done_h: 'Ci vediamo nella grotta',
    code: 'Il tuo codice',
    mail_ok_1: 'Controlla la tua email:',
    mail_ok_2: 'ti abbiamo mandato la conferma con tutti i dettagli e il link per annullare. Se non la vedi, guarda anche nello spam.',
    mail_ko: 'Non siamo riusciti a inviare l’email di conferma. La prenotazione è comunque registrata: segnati il codice qui sopra, oppure chiamaci al',
    ics: 'Aggiungi al calendario',
    another: 'Nuova prenotazione',
    back: 'Indietro',
    cancel_link: 'Devi annullare?',
    cancel_title: 'Annulla la prenotazione',
    cancel_lede: 'Servono il codice che hai ricevuto per email e le ultime 4 cifre del telefono che ci hai lasciato.',
    cancel_code: 'Codice prenotazione',
    cancel_tail: 'Ultime 4 cifre del telefono',
    cancel_do: 'Annulla prenotazione',
    cancel_done: 'Prenotazione annullata. Il tavolo torna disponibile — grazie per averci avvisati.',
    cancel_404: 'Non troviamo nessuna prenotazione con questo codice e queste 4 cifre. Controlla l’email di conferma, oppure chiamaci al',
    phone_only: 'Le prenotazioni online sono momentaneamente sospese. Chiamaci al',
    call_now: 'Chiama ' + TEL_TEXT,
    retry: 'Riprova',
    err_generic: 'Qualcosa non ha funzionato. Riprova, oppure chiamaci al',
    err_network: 'Connessione assente. Controlla la rete e riprova.',
    err_too_fast: 'Aspetta un istante e premi di nuovo Conferma.',
    err_slot: 'Scegli un orario.',
    err_name: 'Scrivi nome e cognome.',
    err_email: 'Serve un indirizzo email valido: ti mandiamo lì la conferma.',
    err_phone: 'Serve un numero di telefono valido (almeno 8 cifre).',
    err_consent: 'Serve il consenso per registrare la prenotazione.',
    err_taken: 'Quell’orario si è appena riempito. Scegline un altro.',
    err_party_reset: 'Con questo numero di persone quell’orario non è più disponibile. Scegline un altro.',
    err_too_late: 'Per quell’orario è ormai tardi. Scegline un altro, o chiamaci.',
    err_too_far: 'Puoi prenotare solo per i prossimi giorni. Scegli una data più vicina.',
    err_closed: 'In quella data siamo chiusi. Scegli un altro giorno.',
    err_party: 'Per un gruppo così grande non prendiamo la prenotazione online: chiamaci al',
    err_duplicate: 'Risulta già una prenotazione con questi dati. Se vuoi cambiarla, chiamaci al',
    err_rate: 'Troppi tentativi ravvicinati. Aspetta qualche minuto e riprova.',
    err_payload: 'Le note sono troppo lunghe: accorciale un po’.',
    err_captcha: 'Verifica anti-spam non riuscita. Riprova.',
    err_cancel_data: 'Servono il codice e le ultime 4 cifre del telefono.'
  };

  // The server names the sittings; these are the Italian labels for the tabs.
  // Sabato and domenica have two, the other open days one, so the row of tabs
  // appears by itself on the weekend.
  var SERVICE_LABEL = {
    pranzo: 'Pranzo',
    cena: 'Cena',
    giornata: 'Tutto il giorno',
    aperitivo: 'Aperitivo'
  };

  function serviceLabel(s) {
    if (SERVICE_LABEL[s]) return SERVICE_LABEL[s];
    return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
  }

  /* --------------------------------------------------------------- state */

  var S = {
    party: 2,
    date: null,
    service: null,
    time: null,
    meta: null,      // accepting / max_party / rome_today
    days: [],
    busy: false,
    booking: null,   // set once confirmed
    flash: null,     // message to surface after a re-render
    f: { name: '', email: '', phone: '', notes: '', consent: false },
    mounted: false,  // the day strip is only centred once
    refocus: null,   // selector to restore focus to after a re-render
    t0: null         // when the form first appeared — see MIN_FILL_MS
  };

  /* ------------------------------------------------- date & time helpers */

  // A UTC-midnight Date for a "YYYY-MM-DD". Formatted with timeZone:'UTC' this
  // yields the same calendar label in every zone on earth.
  function ymdUTC(ymd) {
    var p = String(ymd).split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }

  function fmt(ymd, opts) {
    var o = { timeZone: 'UTC' };
    for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
    return new Intl.DateTimeFormat('it-IT', o).format(ymdUTC(ymd));
  }

  function dayShort(ymd) { return fmt(ymd, { weekday: 'short' }); }
  function dayNum(ymd) { return fmt(ymd, { day: 'numeric' }); }
  function monShort(ymd) { return fmt(ymd, { month: 'short' }); }
  function dayLong(ymd) { return fmt(ymd, { weekday: 'long', day: 'numeric', month: 'long' }); }

  // The one sanctioned way to turn a Rome wall-clock slot into a real instant.
  // day.utc_offset comes from Postgres and is correct for that specific date,
  // so this stays right across both DST transitions.
  function instantOf(day, hhmm) {
    return new Date(day.date + 'T' + hhmm + ':00' + day.utc_offset);
  }

  var visitorTZ = (function () {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return null; }
  })();
  var otherZone = !!visitorTZ && visitorTZ !== ROME;

  function inVisitorTime(day, hhmm) {
    return new Intl.DateTimeFormat('it-IT', {
      timeZone: visitorTZ, hour: '2-digit', minute: '2-digit', hour12: false
    }).format(instantOf(day, hhmm));
  }

  /* ----------------------------------------------------------------- api */

  // Never rejects: a dead network resolves to a plain object the callers can
  // branch on like any other error slug.
  function api(fn, body) {
    return fetch(API + '/' + fn, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: ANON,
        authorization: 'Bearer ' + ANON
      },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json()
        .catch(function () { return { ok: false, error: 'server_error' }; })
        // httpStatus, NOT status. `status` is a real column on porca.bookings
        // ('confirmed' | 'cancelled' | 'noshow' | 'seated') and the day the book
        // endpoint echoes it back, assigning the HTTP code over it would render
        // every request as a confirmation — code, calendar file and all — for a
        // table that is nothing of the sort. This is not hypothetical: a sister
        // booking system grew a 'pending' state and shipped exactly that bug.
        // Do not rename this back.
        .then(function (j) { j.httpStatus = r.status; return j; });
    }).catch(function () {
      return { ok: false, error: 'network', httpStatus: 0 };
    });
  }

  /* ------------------------------------------------------- dom shorthand */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function telLink(label) {
    var a = el('a', null, label || TEL_TEXT);
    a.href = 'tel:' + TEL_HREF;
    return a;
  }

  // "…chiamaci al 06 6549 5256." with the number as a real tel: link.
  function withTel(node, lead, tail) {
    if (lead) node.appendChild(document.createTextNode(lead + ' '));
    node.appendChild(telLink());
    node.appendChild(document.createTextNode(tail == null ? '.' : tail));
    return node;
  }

  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function scrollBehavior() { return prefersReduced() ? 'auto' : 'smooth'; }

  var painted = false;   // has the widget swapped its contents at least once?

  function shell(node) {
    while (root.firstChild) root.removeChild(root.firstChild);
    root.appendChild(node);
    painted = true;
  }

  /* ------------------------------------------------------- live region */

  // A live region has to be sitting in the document BEFORE its text changes.
  // Every screen this widget paints is built off-DOM and inserted already
  // populated, so a role="status" on the inserted node announces nothing at all
  // in NVDA or JAWS — the confirmation screen, code and date included, went out
  // silent. One persistent region, outside #porca-prenota so shell() cannot
  // throw it away, written to after each swap.
  var LIVE = null;

  function announce(msg) {
    if (!msg) return;
    if (!LIVE) {
      LIVE = el('p', 'u-sr');
      LIVE.setAttribute('role', 'status');
      LIVE.setAttribute('aria-live', 'polite');
      LIVE.setAttribute('aria-atomic', 'true');
      (root.parentNode || document.body).appendChild(LIVE);
    }
    // Clear first, then write on the next tick: the same string twice in a row
    // is otherwise a no-op change and is never spoken.
    LIVE.textContent = '';
    window.setTimeout(function () { LIVE.textContent = msg; }, 60);
  }

  function fieldset(n, label) {
    var fs = el('fieldset', 'fieldset');
    var lg = el('legend', 'legend');
    lg.appendChild(el('span', 'legend__n', '0' + n));
    lg.appendChild(document.createTextNode(label));
    fs.appendChild(lg);
    return fs;
  }

  /* ------------------------------------------------------------ recap col */

  function setRecap(k, v) {
    if (!RIEP) return;
    var node = RIEP.querySelector('[data-r="' + k + '"]');
    if (!node) return;
    // The markup ships a real Italian placeholder in every value cell ("Da
    // scegliere", "Da compilare"). syncRecap() runs on the very first render,
    // when the time and the name are still empty, so writing an em-dash here
    // replaced four sentences with four dashes — which is what a screen reader
    // then reads out. Keep the placeholder instead. data-empty is the contract;
    // if the attribute has not landed yet we snapshot the shipped text once,
    // before anything has had a chance to overwrite it.
    if (node.dataset.empty == null) node.dataset.empty = (node.textContent || '').trim();
    node.textContent = v || node.dataset.empty || '';
  }

  function syncRecap() {
    setRecap('date', S.date ? dayLong(S.date) : '');
    setRecap('time', S.time || '');
    setRecap('party', S.party ? (S.party + (S.party === 1 ? ' persona' : ' persone')) : '');
    setRecap('name', (S.f.name || '').trim());
  }

  /* --------------------------------------------------------- availability */

  function loadAvailability(keepTime) {
    var wantedTime = keepTime ? S.time : null;
    var wantedService = keepTime ? S.service : null;
    snapshotFields();          // the loading shell destroys the form: save first
    renderLoading();
    return api('porca-availability', { party: S.party }).then(function (r) {
      // porca-availability sends no `ok` field on success — the presence of
      // `days` is the signal.
      if (!r || !r.days || !r.days.length) {
        renderFatal(r && r.error === 'network');
        return;
      }
      S.meta = r;
      // The database decides how far ahead it will take a booking
      // (porca.settings.horizon_days); a shorter number hard-coded here would
      // hide days porca-book would happily accept. Honour the payload when it
      // names the horizon, fall back to the strip length only until it does.
      var shown = (+r.horizon_days > 0) ? +r.horizon_days : DAYS_SHOWN;
      S.days = r.days.slice(0, shown);

      if (r.accepting === false) { renderPhoneOnly(); return; }

      // Keep the chosen date if it survived the reload, else jump to the first
      // day that is actually open.
      var still = S.date && S.days.some(function (d) { return d.date === S.date && !d.closed; });
      if (!still) {
        var open = S.days.filter(function (d) { return !d.closed; })[0];
        S.date = open ? open.date : (S.days[0] && S.days[0].date) || null;
        S.service = null;        // different day, different sitting
      } else if (!keepTime) {
        S.service = null;
      }
      S.time = null;

      // A party-size change re-asks the server: the hour you had picked may no
      // longer seat you. Keep it when it still does, say so plainly when it does
      // not. The lookup has to happen inside the sitting the guest was actually
      // looking at — sabato and domenica have two, and checking the wrong one
      // would report every cena slot as gone the moment someone taps a number.
      if (wantedTime) {
        if (still && wantedService) S.service = wantedService;
        if (slotIsOpen(wantedTime)) S.time = wantedTime;
        else S.flash = T.err_party_reset;
      }
      render();
    });
  }

  function currentDay() {
    for (var i = 0; i < S.days.length; i++) if (S.days[i].date === S.date) return S.days[i];
    return null;
  }

  function slotsOfDay() {
    var day = currentDay();
    if (!day || day.closed) return [];
    var services = day.services || [];
    var chosen = S.service;
    if (!chosen && services.length) chosen = services[0].service;
    var out = [];
    services.forEach(function (sv) { if (sv.service === chosen) out = sv.slots || []; });
    return out;
  }

  function slotIsOpen(hhmm) {
    return slotsOfDay().some(function (sl) { return sl.time === hhmm && sl.ok; });
  }

  /* Re-rendering must never eat something the guest already typed. */
  function snapshotFields() {
    var form = root.querySelector('form[data-form="book"]');
    if (!form) return;
    ['name', 'email', 'phone', 'notes'].forEach(function (k) {
      var input = form.elements[k];
      if (input) S.f[k] = input.value;
    });
    var c = form.elements.consent;
    if (c) S.f.consent = !!c.checked;
  }

  /* ----------------------------------------------------------- rendering */

  function renderLoading() {
    var w = el('div');
    // No role="status" on this node: it is inserted already populated, which
    // announces nothing. announce() below owns the speech.
    w.appendChild(el('p', 'hint', T.loading));
    for (var i = 0; i < 4; i++) w.appendChild(el('div', 'skel'));
    shell(w);
    announce(T.loading);
  }

  function renderPhoneOnly() {
    var w = el('div');
    w.appendChild(withTel(el('p', 'alert alert--info'), T.phone_only));
    var row = el('div', 'cta-row');
    var b = el('a', 'btn btn--vino', T.call_now);
    b.href = 'tel:' + TEL_HREF;
    row.appendChild(b);
    w.appendChild(row);
    var announceIt = painted;   // a state change, not the first paint
    shell(w);
    // On first paint the card IS the page and the guest will read it on the way
    // down; announcing then would just say the same thing twice. Reaching this
    // screen mid-flow, though, is a change nobody would otherwise be told about.
    if (announceIt) announce(T.phone_only + ' ' + TEL_TEXT + '.');
  }

  // A dropped connection, a 429 or a 500 used to leave the guest on a dead end:
  // an apology, a phone number, and no way back except reloading the page — on a
  // phone, in a tufo cave, which is precisely where this gets used. The retry
  // button re-asks the same endpoint; the network slug, which was being computed
  // and then thrown away, now picks the message that is actually true.
  function renderFatal(isNetwork) {
    var w = el('div');
    var p = el('p', 'alert alert--err');
    p.setAttribute('role', 'alert');
    if (isNetwork) p.textContent = T.err_network;
    else withTel(p, T.err_generic);
    w.appendChild(p);

    var row = el('div', 'cta-row');
    var again = el('button', 'btn btn--vino', T.retry);
    again.type = 'button';
    again.setAttribute('data-retry', '');
    row.appendChild(again);
    var b = el('a', 'btn btn--linea', T.call_now);
    b.href = 'tel:' + TEL_HREF;
    row.appendChild(b);
    w.appendChild(row);

    shell(w);
    // Only when the guest asked for this screen — a failure on first paint must
    // not drag focus off the top of the page into the middle of it.
    if (S.refocus === '[data-retry]') {
      S.refocus = null;
      if (again.isConnected) { try { again.focus({ preventScroll: true }); } catch (e) { /* noop */ } }
    }
  }

  function fieldRow(id, name, label, type, opts) {
    opts = opts || {};
    var wrap = el('div', 'field');

    var lab = el('label', 'label');
    lab.htmlFor = id;
    lab.appendChild(document.createTextNode(label));
    if (opts.required) {
      lab.appendChild(document.createTextNode(' '));
      lab.appendChild(el('span', 'req', '*'));
    }
    wrap.appendChild(lab);

    var input;
    if (type === 'textarea') {
      input = el('textarea', 'textarea');
      input.rows = 3;
      input.maxLength = 400;
    } else {
      input = el('input', 'input');
      input.type = type;
      if (opts.maxlength) input.maxLength = opts.maxlength;
    }
    input.id = id;
    input.name = name;
    input.value = S.f[name] || '';
    if (opts.autocomplete) input.autocomplete = opts.autocomplete;
    if (opts.inputmode) input.inputMode = opts.inputmode;
    if (opts.required) input.required = true;
    wrap.appendChild(input);

    var err = el('p', 'ferr');
    err.id = id + '-err';
    err.hidden = true;
    err.setAttribute('data-err', name);
    wrap.appendChild(err);

    if (opts.hint) wrap.appendChild(el('p', 'hint', opts.hint));
    return wrap;
  }

  function render() {
    if (S.booking) return renderDone();
    if (S.meta && S.meta.accepting === false) return renderPhoneOnly();

    snapshotFields();

    var day = currentDay();
    var services = day && !day.closed ? (day.services || []) : [];
    if (!S.service && services.length) S.service = services[0].service;

    var form = el('form');
    form.setAttribute('novalidate', '');
    form.setAttribute('data-form', 'book');

    /* 01 — che giorno --------------------------------------------------- */
    var fs1 = fieldset(1, T.date);
    var strip = el('div', 'chips chips--scroll');
    strip.setAttribute('role', 'group');
    strip.setAttribute('aria-label', T.date);
    S.days.forEach(function (d) {
      var on = d.date === S.date;
      var b = el('button', 'chip chip--day' + (d.closed ? ' is-closed' : ''));
      b.type = 'button';
      b.setAttribute('data-date', d.date);
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', dayLong(d.date) + (d.closed ? ' — chiuso' : ''));
      if (d.closed) b.disabled = true;
      b.appendChild(el('span', null, dayShort(d.date)));
      b.appendChild(el('b', null, dayNum(d.date)));
      b.appendChild(el('span', null, d.closed ? T.closed : monShort(d.date)));
      strip.appendChild(b);
    });
    rove(strip);
    fs1.appendChild(strip);
    form.appendChild(fs1);

    /* 02 — a che ora ---------------------------------------------------- */
    var fs2 = fieldset(2, T.slot);
    if (day && day.closed) {
      fs2.appendChild(el('p', 'hint', day.note || T.closed_day));
    } else if (!services.length) {
      fs2.appendChild(el('p', 'hint', T.no_slots));
    } else {
      // Sabato and domenica run pranzo and cena; the other open days run one
      // sitting, so this row simply does not appear on those days.
      if (services.length > 1) {
        var tabs = el('div', 'chips');
        tabs.setAttribute('role', 'group');
        tabs.setAttribute('aria-label', T.service);
        services.forEach(function (sv) {
          var on = sv.service === S.service;
          var b = el('button', 'chip', serviceLabel(sv.service));
          b.type = 'button';
          b.setAttribute('data-service', sv.service);
          b.setAttribute('aria-pressed', String(on));
          tabs.appendChild(b);
        });
        var tabWrap = el('div', 'field');      // .field carries the gap to the slot grid
        tabWrap.appendChild(tabs);
        fs2.appendChild(tabWrap);
      }

      var slots = slotsOfDay();
      if (!slots.length) {
        fs2.appendChild(el('p', 'hint', T.no_slots));
      } else {
        var grid = el('div', 'chips');
        grid.setAttribute('role', 'group');
        grid.setAttribute('aria-label', T.slot);
        slots.forEach(function (sl) {
          var on = sl.time === S.time;
          var b = el('button', 'chip chip--day chip--ora');
          b.type = 'button';
          b.setAttribute('data-time', sl.time);
          b.setAttribute('aria-pressed', String(on));
          b.setAttribute('aria-label', sl.time + (sl.ok ? '' : ' — ' + T.full));
          if (!sl.ok) b.disabled = true;
          b.appendChild(el('b', null, sl.time));
          // No seat counts, ever: bookable, or esaurito.
          b.appendChild(el('span', null, sl.ok ? '' : T.full));
          grid.appendChild(b);
        });
        rove(grid);
        fs2.appendChild(grid);

        if (otherZone && S.time && day) {
          var tz = el('p', 'hint');
          tz.appendChild(document.createTextNode(T.rome_note + ' '));
          var strong = el('strong', null,
            S.time + ' → ' + inVisitorTime(day, S.time) + ' ' + T.your_time + ' (' + visitorTZ + ')');
          tz.appendChild(strong);
          fs2.appendChild(tz);
        }
      }
    }
    form.appendChild(fs2);

    /* 03 — quante persone ------------------------------------------------ */
    var fs3 = fieldset(3, T.people);
    var party = el('div', 'chips');
    party.setAttribute('role', 'group');
    party.setAttribute('aria-label', T.people);
    // The server's number, not ours. MAX_PARTY only covers the render that
    // happens before porca-availability has answered.
    var maxP = (S.meta && S.meta.max_party) || MAX_PARTY;
    var chipMax = Math.min(maxP, CHIP_PARTY_MAX);
    var big = S.party > chipMax;
    for (var n = 1; n <= chipMax; n++) {
      var pb = el('button', 'chip', String(n));
      pb.type = 'button';
      pb.setAttribute('data-party', String(n));
      pb.setAttribute('aria-pressed', String(n === S.party));
      party.appendChild(pb);
    }
    if (maxP > chipMax) {
      // Selecting it lands on the first size the chips cannot express, and the
      // picker below opens with that already chosen.
      var mb = el('button', 'chip chip--more', T.party_more_chip);
      mb.type = 'button';
      mb.setAttribute('data-party', String(chipMax + 1));
      mb.setAttribute('aria-pressed', String(big));
      party.appendChild(mb);
    }
    rove(party);
    fs3.appendChild(party);

    if (maxP > chipMax && big) {
      var pick = el('div', 'partypick');
      var plab = el('label', 'label', T.party_more_label + ' ' + maxP);
      plab.setAttribute('for', 'pp-party-more');
      var psel = el('select', 'select');
      psel.id = 'pp-party-more';
      psel.name = 'party_more';
      psel.setAttribute('data-party-select', '');
      for (var m = chipMax + 1; m <= maxP; m++) {
        var opt = el('option', '', m + ' ' + T.party_more_unit);
        opt.value = String(m);
        if (m === S.party) opt.selected = true;
        psel.appendChild(opt);
      }
      pick.appendChild(plab);
      pick.appendChild(psel);
      fs3.appendChild(pick);
    }
    form.appendChild(fs3);

    /* 04 — i tuoi dati ---------------------------------------------------- */
    var fs4 = fieldset(4, T.you);
    fs4.appendChild(fieldRow('pp-name', 'name', T.name, 'text',
      { autocomplete: 'name', maxlength: 80, required: true }));
    fs4.appendChild(fieldRow('pp-email', 'email', T.email, 'email',
      { autocomplete: 'email', inputmode: 'email', maxlength: 120, required: true }));
    fs4.appendChild(fieldRow('pp-phone', 'phone', T.phone, 'tel',
      { autocomplete: 'tel', inputmode: 'tel', maxlength: 32, required: true }));
    fs4.appendChild(fieldRow('pp-notes', 'notes', T.notes, 'textarea',
      { hint: T.notes_hint }));

    // Honeypot — off-screen via .hp, not display:none (some bots skip hidden
    // inputs, and filling this one is exactly the signal we want).
    //
    // The name is NOT "company" any more, and must never go back to being a word
    // a browser recognises. `company` maps onto the `organization` autofill
    // token: Safari and Chrome fill it from the address book, password managers
    // fill it too, and autocomplete="off" is advisory at best. A guest whose
    // autofill touched this field tripped porca-book's decoy branch and got
    // ok:true, a real-looking PP-XXXXX and a working .ics — for a table that was
    // never written. A fake confirmation is worse than no booking form at all.
    var hp = el('div', 'hp');
    hp.setAttribute('aria-hidden', 'true');
    var hpLab = el('label', null, 'Non compilare');
    var hpIn = el('input');
    hpIn.type = 'text';
    hpIn.name = HP_FIELD;
    hpIn.tabIndex = -1;
    hpIn.autocomplete = 'off';
    hpLab.appendChild(hpIn);
    hp.appendChild(hpLab);
    fs4.appendChild(hp);

    var consent = el('label', 'check');
    consent.htmlFor = 'pp-consent';
    var cb = el('input');
    cb.type = 'checkbox';
    cb.id = 'pp-consent';
    cb.name = 'consent';
    cb.required = true;
    cb.checked = !!S.f.consent;
    consent.appendChild(cb);
    var cText = el('span');
    if (PRIVACY) {
      cText.appendChild(document.createTextNode(T.consent_pre));
      var pa = el('a', null, T.consent_link);
      pa.href = PRIVACY;
      cText.appendChild(pa);
      cText.appendChild(document.createTextNode(T.consent_post));
    } else {
      cText.textContent = T.consent_plain;
    }
    consent.appendChild(cText);
    fs4.appendChild(consent);

    var cErr = el('p', 'ferr');
    cErr.id = 'pp-consent-err';
    cErr.hidden = true;
    cErr.setAttribute('data-err', 'consent');
    fs4.appendChild(cErr);

    if (CFG.turnstileSiteKey) {
      var ts = el('div', 'cf-turnstile');
      ts.setAttribute('data-sitekey', CFG.turnstileSiteKey);
      ts.setAttribute('data-theme', 'light');
      fs4.appendChild(ts);
    }
    form.appendChild(fs4);

    /* azioni --------------------------------------------------------------- */
    var box = el('p', 'alert alert--err');
    box.setAttribute('role', 'alert');
    box.setAttribute('data-formerr', '');
    box.hidden = true;
    form.appendChild(box);

    var submit = el('button', 'btn btn--vino btn--wide', T.submit);
    submit.type = 'submit';
    submit.setAttribute('data-submit', '');
    submit.disabled = true;
    form.appendChild(submit);

    var foot = el('p', 'hint');
    var openCancel = el('button', 'linkish', T.cancel_link);
    openCancel.type = 'button';
    openCancel.setAttribute('data-open-cancel', '');
    foot.appendChild(openCancel);
    form.appendChild(foot);

    shell(form);

    // Time-to-fill baseline: set once, when the form first appears, not on every
    // chip tap. See submitBooking().
    if (S.t0 == null) S.t0 = Date.now();

    if (S.flash) { showErr(form, S.flash); S.flash = null; }
    syncSubmit(form);
    syncRecap();
    restoreFocus();
    if (!S.mounted) { centreSelectedDay(); S.mounted = true; }

    if (window.turnstile && CFG.turnstileSiteKey) {
      try { window.turnstile.render('.cf-turnstile'); } catch (e) { /* already rendered */ }
    }
  }

  function renderDone() {
    var b = S.booking;
    var day = { date: b.service_date, utc_offset: b.utc_offset };
    var w = el('div', 'done');
    // Deliberately no role="status" here — see announce(). This node is built
    // off-DOM and inserted already full, which announces nothing.

    w.appendChild(el('p', 'label', T.done_k));
    w.appendChild(el('h2', 'done__t', T.done_h));
    w.appendChild(el('p', 'label', T.code));
    w.appendChild(el('p', 'done__code', b.code));
    w.appendChild(el('p', 'done__when',
      dayLong(b.service_date) + ' · ' + b.slot_time + ' · ' +
      b.party + (b.party === 1 ? ' persona' : ' persone')));

    if (otherZone && b.utc_offset) {
      w.appendChild(el('p', 'hint',
        b.slot_time + ' Roma → ' + inVisitorTime(day, b.slot_time) + ' ' + T.your_time));
    }

    if (b.emailSent === false) {
      // Say it plainly: the table is booked, the email is not on its way.
      var ko = el('p', 'alert alert--err');
      withTel(ko, T.mail_ko);
      w.appendChild(ko);
    } else {
      var ok = el('p', 'alert alert--ok');
      ok.appendChild(document.createTextNode(T.mail_ok_1 + ' '));
      ok.appendChild(el('strong', null, b.email));
      ok.appendChild(document.createTextNode(' — ' + T.mail_ok_2));
      w.appendChild(ok);
    }

    var row = el('div', 'cta-row');
    var ics = icsHref(b);
    if (ics) {
      var a = el('a', 'btn btn--linea', T.ics);
      a.href = ics;
      a.setAttribute('download', 'porca-porchetta-' + b.code + '.ics');
      row.appendChild(a);
    }
    var cb2 = el('button', 'btn btn--linea', T.cancel_do);
    cb2.type = 'button';
    cb2.setAttribute('data-cancel-booking', '');
    row.appendChild(cb2);
    var ab = el('button', 'btn btn--linea', T.another);
    ab.type = 'button';
    ab.setAttribute('data-again', '');
    row.appendChild(ab);
    w.appendChild(row);

    shell(w);
    syncRecap();
    announce(
      T.done_k + '. ' + T.code + ' ' + b.code + '. ' +
      dayLong(b.service_date) + ', ' + b.slot_time + ', ' +
      b.party + (b.party === 1 ? ' persona' : ' persone') + '.'
    );
  }

  function renderCancel(prefill) {
    var p = prefill || {};
    var form = el('form');
    form.setAttribute('novalidate', '');
    form.setAttribute('data-form', 'cancel');

    var fs = el('fieldset', 'fieldset');
    fs.appendChild(el('legend', 'legend', T.cancel_title));
    fs.appendChild(el('p', 'hint', T.cancel_lede));

    var f1 = el('div', 'field');
    var l1 = el('label', 'label', T.cancel_code);
    l1.htmlFor = 'pp-code';
    f1.appendChild(l1);
    var i1 = el('input', 'input');
    i1.id = 'pp-code';
    i1.name = 'code';
    i1.type = 'text';
    i1.maxLength = 16;
    i1.autocomplete = 'off';
    i1.required = true;
    i1.placeholder = 'PP-XXXXX';
    i1.value = p.code || '';
    f1.appendChild(i1);
    fs.appendChild(f1);

    var f2 = el('div', 'field');
    var l2 = el('label', 'label', T.cancel_tail);
    l2.htmlFor = 'pp-tail';
    f2.appendChild(l2);
    var i2 = el('input', 'input');
    i2.id = 'pp-tail';
    i2.name = 'tail';
    i2.type = 'text';
    i2.inputMode = 'numeric';
    i2.maxLength = 4;
    i2.autocomplete = 'off';
    i2.required = true;
    i2.value = p.tail || '';
    f2.appendChild(i2);
    fs.appendChild(f2);
    form.appendChild(fs);

    var box = el('p', 'alert alert--err');
    box.setAttribute('role', 'alert');
    box.setAttribute('data-formerr', '');
    box.hidden = true;
    form.appendChild(box);

    var submit = el('button', 'btn btn--vino btn--wide', T.cancel_do);
    submit.type = 'submit';
    submit.setAttribute('data-submit', '');
    form.appendChild(submit);

    var foot = el('p', 'hint');
    var back = el('button', 'linkish', T.back);
    back.type = 'button';
    back.setAttribute('data-again', '');
    foot.appendChild(back);
    form.appendChild(foot);

    shell(form);
  }

  function renderCancelDone() {
    var w = el('div');
    // No role="status": inserted already populated. announce() speaks instead.
    w.appendChild(el('p', 'alert alert--ok', T.cancel_done));
    var row = el('div', 'cta-row');
    var again = el('button', 'btn btn--vino', T.another);
    again.type = 'button';
    again.setAttribute('data-again', '');
    row.appendChild(again);
    w.appendChild(row);
    shell(w);
    announce(T.cancel_done);
  }

  /* ------------------------------------------------------------- events */

  root.addEventListener('click', function (e) {
    var target = e.target.closest && e.target.closest('button');
    if (!target || S.busy) return;

    if (target.hasAttribute('data-party')) {
      S.party = +target.getAttribute('data-party');
      S.refocus = '[data-party="' + target.getAttribute('data-party') + '"]';
      syncRecap();
      loadAvailability(true);             // availability depends on party size
      return;
    }
    if (target.hasAttribute('data-date')) {
      S.date = target.getAttribute('data-date');
      S.service = null;
      S.time = null;
      S.refocus = '[data-date="' + S.date + '"]';
      render();
      return;
    }
    if (target.hasAttribute('data-service')) {
      S.service = target.getAttribute('data-service');
      S.time = null;
      S.refocus = '[data-service="' + S.service + '"]';
      render();
      return;
    }
    if (target.hasAttribute('data-time')) {
      var firstPick = !S.time;
      S.time = target.getAttribute('data-time');
      S.refocus = '[data-time="' + S.time + '"]';
      render();
      focusDetails(firstPick);
      return;
    }
    if (target.hasAttribute('data-retry')) {
      S.refocus = '[data-retry]';
      loadAvailability(true);
      return;
    }
    if (target.hasAttribute('data-open-cancel')) { snapshotFields(); renderCancel(); return; }
    if (target.hasAttribute('data-cancel-booking')) {
      renderCancel({
        code: S.booking && S.booking.code,
        tail: S.booking && S.booking.tail
      });
      return;
    }
    if (target.hasAttribute('data-again')) {
      // Fresh start, and nothing of the previous guest left on a shared screen.
      S.booking = null;
      S.time = null;
      S.t0 = null;
      S.f = { name: '', email: '', phone: '', notes: '', consent: false };
      syncRecap();
      loadAvailability();
      return;
    }
  });

  // Live riepilogo + submit gate, without re-rendering under the guest's cursor.
  root.addEventListener('input', function (e) {
    var input = e.target;
    if (!input.name) return;
    if (input.name === 'name') {
      S.f.name = input.value;
      setRecap('name', input.value.trim());
    }
    clearFieldErr(input);
    var form = input.form;
    if (form && form.getAttribute('data-form') === 'book') syncSubmit(form);
  });

  root.addEventListener('change', function (e) {
    if (e.target.hasAttribute('data-party-select')) {
      S.party = +e.target.value;
      S.refocus = '[data-party-select]';
      syncRecap();
      loadAvailability(true);             // availability depends on party size
      return;
    }
    if (e.target.name === 'consent') {
      S.f.consent = !!e.target.checked;
      clearFieldErr(e.target);
      if (e.target.form) syncSubmit(e.target.form);
    }
  });

  // Shape problems are worth flagging as soon as the guest leaves the field.
  root.addEventListener('focusout', function (e) {
    var input = e.target;
    if (!input.name || !input.value) return;
    if (input.name === 'email' && !EMAIL_SHAPE.test(input.value.trim())) {
      fieldErr(input.form, 'email', T.err_email, false);
    }
    if (input.name === 'phone' && (input.value.match(/\d/g) || []).length < 8) {
      fieldErr(input.form, 'phone', T.err_phone, false);
    }
  });

  root.addEventListener('submit', function (e) {
    e.preventDefault();
    if (S.busy) return;
    var form = e.target;
    if (form.getAttribute('data-form') === 'cancel') submitCancel(form);
    else submitBooking(form);
  });

  // Focus moves to the form ONCE — the first time an hour is picked and steps
  // 01–03 actually hold an answer. Doing it on every slot tap was hostile: a
  // keyboard user changing their mind about the hour landed in #pp-name and had
  // to Shift+Tab back out through the whole party row to reach the grid again,
  // and on iOS the programmatic focus counts as a user gesture, so re-tapping a
  // time threw the soft keyboard up and reflowed the page under the thumb.
  // Every later pick just brings the fieldset into view and leaves focus alone.
  function focusDetails(firstPick) {
    var f = root.querySelector('#pp-name');
    if (!f) return;
    var fs = (f.closest && f.closest('.fieldset')) || f;
    var complete = !!(S.date && S.time && S.party);

    if (firstPick && complete && !f.value) {
      f.focus({ preventScroll: true });
      fs.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
      return;
    }
    fs.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
  }

  // Re-rendering the whole widget throws focus back to <body>; keyboard users
  // would lose their place on every tap. Put them back on the control they hit.
  function restoreFocus() {
    if (!S.refocus) return;
    var node = root.querySelector(S.refocus);
    S.refocus = null;
    // The control they pressed can legitimately be gone — a retry that
    // succeeded, a chip that a new payload removed. Land on the first thing in
    // the widget rather than dumping them at the top of the document.
    if (!node) node = root.querySelector('.chips button:not([disabled])');
    if (node) { try { node.focus({ preventScroll: true }); } catch (e) { node.focus(); } }
  }

  /* --------------------------------------------------- roving tabindex */

  // Fourteen days, two sittings, a dozen hours and eight party sizes are
  // thirty-odd tab stops between the top of the form and the name field. These
  // are single-choice groups, so they get one tab stop each and arrow keys move
  // inside them. aria-pressed is untouched: it still carries both the selection
  // announcement and the selected styling, and pressing Enter or Space still
  // chooses — arrows only move focus.
  function roveItems(box) {
    return Array.prototype.filter.call(
      box.querySelectorAll('button'),
      function (b) { return !b.disabled; }
    );
  }

  function rove(box) {
    box.setAttribute('data-rove', '');
    var items = roveItems(box);
    if (!items.length) return;
    var cur = items.filter(function (b) {
      return b.getAttribute('aria-pressed') === 'true';
    })[0] || items[0];
    items.forEach(function (b) { b.tabIndex = (b === cur) ? 0 : -1; });
  }

  root.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'ArrowDown' &&
        k !== 'ArrowUp' && k !== 'Home' && k !== 'End') return;
    var box = e.target.closest && e.target.closest('[data-rove]');
    if (!box) return;
    var items = roveItems(box);
    var i = items.indexOf(e.target);
    if (i < 0) return;

    var n;
    if (k === 'Home') n = 0;
    else if (k === 'End') n = items.length - 1;
    else if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % items.length;
    else n = (i - 1 + items.length) % items.length;

    e.preventDefault();
    items.forEach(function (b) { b.tabIndex = (b === items[n]) ? 0 : -1; });
    try { items[n].focus({ preventScroll: true }); } catch (e2) { items[n].focus(); }
    // Keep the day strip scrolled to whatever now has focus, without dragging
    // the page: the strip scrolls horizontally on its own.
    items[n].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  function centreSelectedDay() {
    var strip = root.querySelector('.chips--scroll');
    var on = strip && strip.querySelector('[aria-pressed="true"]');
    if (!strip || !on) return;
    // Not scrollIntoView: that would drag the whole page to the widget on load.
    strip.scrollLeft = Math.max(0, on.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2);
  }

  /* --------------------------------------------------------- validation */

  // Same shape the Edge Function and Postgres both enforce. Client-side checks
  // are a courtesy, never the boundary.
  var EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function showErr(form, msg, withPhone) {
    var box = form.querySelector('[data-formerr]');
    if (!box) return;
    box.textContent = '';
    box.appendChild(document.createTextNode(msg));
    if (withPhone) {
      box.appendChild(document.createTextNode(' '));
      box.appendChild(telLink());
      box.appendChild(document.createTextNode('.'));
    }
    box.hidden = false;
    box.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
  }

  function fieldErr(form, field, msg, focus) {
    if (!form) return;
    var box = form.querySelector('[data-err="' + field + '"]');
    var input = form.elements[field];
    if (box) { box.textContent = msg; box.hidden = false; }
    if (input && input.setAttribute) {
      input.setAttribute('aria-invalid', 'true');
      if (box) input.setAttribute('aria-describedby', box.id || (box.id = 'pp-' + field + '-err'));
      if (focus) {
        input.focus({ preventScroll: true });
        input.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
      }
    }
  }

  function clearFieldErr(input) {
    if (!input || !input.form || !input.name) return;
    var box = input.form.querySelector('[data-err="' + input.name + '"]');
    if (box) { box.hidden = true; box.textContent = ''; }
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }

  function clearAllErrs(form) {
    Array.prototype.forEach.call(form.querySelectorAll('.ferr'), function (b) {
      b.hidden = true; b.textContent = '';
    });
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (i) {
      i.removeAttribute('aria-invalid');
      i.removeAttribute('aria-describedby');
    });
    var box = form.querySelector('[data-formerr]');
    if (box) { box.hidden = true; box.textContent = ''; }
  }

  /** The submit stays shut until every required answer is on the page. */
  function syncSubmit(form) {
    var btn = form.querySelector('[data-submit]');
    if (!btn || S.busy) return;
    var ok = !!S.time &&
      (form.elements.name.value || '').trim().length > 0 &&
      (form.elements.email.value || '').trim().length > 0 &&
      (form.elements.phone.value || '').trim().length > 0 &&
      !!form.elements.consent.checked;
    btn.disabled = !ok;
  }

  function busy(form, on, label) {
    S.busy = on;
    var btn = form.querySelector('[data-submit]');
    if (!btn) return;
    btn.disabled = on;
    btn.textContent = on ? T.sending : label;
    if (!on && form.getAttribute('data-form') === 'book') syncSubmit(form);
  }

  /* ---------------------------------------------------------- submitting */

  function submitBooking(form) {
    var d = new FormData(form);
    var name = (d.get('name') || '').toString().trim();
    var email = (d.get('email') || '').toString().trim();
    var phone = (d.get('phone') || '').toString().trim();

    clearAllErrs(form);

    if (!S.time) return showErr(form, T.err_slot);
    if (name.length < 2) return fieldErr(form, 'name', T.err_name, true);
    if (!EMAIL_SHAPE.test(email)) return fieldErr(form, 'email', T.err_email, true);
    if ((phone.match(/\d/g) || []).length < 8) return fieldErr(form, 'phone', T.err_phone, true);
    if (!d.get('consent')) return fieldErr(form, 'consent', T.err_consent, true);

    // Time to fill. The submit button only unlocks once an hour is chosen and
    // four fields are filled, so a human cannot reach this line in under a
    // second and a half; a script reaches it in fifty milliseconds. Refuse
    // locally rather than send — the one thing this must never do is hand back
    // a plausible confirmation, which is exactly what the server's decoy branch
    // would do. The second press is late by definition, so a real guest who
    // somehow tripped it is one click from booking.
    var elapsed = S.t0 == null ? MIN_FILL_MS : (Date.now() - S.t0);
    if (elapsed < MIN_FILL_MS) return showErr(form, T.err_too_fast);

    var tf = form.querySelector('[name="cf-turnstile-response"]');
    var token = tf ? tf.value : '';
    var hp = (d.get(HP_FIELD) || '').toString();

    busy(form, true, T.submit);

    api('porca-book', {
      party: S.party,
      date: S.date,
      time: S.time,
      name: name,
      email: email,
      phone: phone,
      notes: (d.get('notes') || '').toString().trim(),
      consent: true,
      token: token,
      elapsed_ms: elapsed,
      // Sent under both names on purpose, so the rename can land here and in
      // porca-book independently without a window where the trap is off.
      // Delete `company` once porca-book reads pp_note_2.
      pp_note_2: hp,
      company: hp
    }).then(function (r) {
      busy(form, false, T.submit);

      if (r.ok) {
        var day = currentDay();
        S.booking = {
          code: r.code,
          service_date: S.date,
          slot_time: S.time,
          party: r.party || S.party,
          email: email,
          // The cancel form asks for the last 4 digits; prefer the server's
          // idea of them, fall back to what the guest just typed.
          tail: r.phone_tail || (phone.match(/\d/g) || []).slice(-4).join(''),
          emailSent: r.emailSent !== false,
          starts_at: r.starts_at,
          ends_at: r.ends_at,
          utc_offset: day ? day.utc_offset : null
        };
        renderDone();
        root.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
        return;
      }

      if (r.error === 'not_accepting') return renderPhoneOnly();
      if (r.error === 'network') return showErr(form, T.err_network);
      if (r.error === 'invalid_name') return fieldErr(form, 'name', r.message || T.err_name, true);
      if (r.error === 'invalid_email') return fieldErr(form, 'email', r.message || T.err_email, true);
      if (r.error === 'invalid_phone') return fieldErr(form, 'phone', r.message || T.err_phone, true);
      if (r.error === 'consent_required') return fieldErr(form, 'consent', r.message || T.err_consent, true);
      if (r.error === 'payload_too_large') return fieldErr(form, 'notes', r.message || T.err_payload, true);
      if (r.error === 'party_too_large') return showErr(form, r.message || T.err_party, true);
      if (r.error === 'duplicate') return showErr(form, r.message || T.err_duplicate, true);
      if (r.error === 'too_far') return showErr(form, r.message || T.err_too_far);
      if (r.error === 'rate_limited') return showErr(form, r.message || T.err_rate);
      if (r.error === 'captcha_failed') {
        if (window.turnstile) { try { window.turnstile.reset(); } catch (e2) { /* noop */ } }
        return showErr(form, r.message || T.err_captcha);
      }

      // A rejection of this kind means the room, or the clock, moved while the
      // form sat open. Refresh the grid rather than leaving stale availability
      // on screen with a dead hour still selected.
      if (r.error === 'full' || r.error === 'too_late' ||
          r.error === 'no_such_slot' || r.error === 'closed') {
        S.flash = r.message || (
          r.error === 'too_late' ? T.err_too_late :
          r.error === 'closed' ? T.err_closed : T.err_taken
        );
        S.time = null;
        loadAvailability();
        return;
      }

      // server_error and anything unmapped
      showErr(form, r.message || T.err_generic, !r.message);
      if (window.turnstile) { try { window.turnstile.reset(); } catch (e3) { /* noop */ } }
    });
  }

  function submitCancel(form) {
    var d = new FormData(form);
    var code = (d.get('code') || '').toString().trim().toUpperCase();
    var tail = (d.get('tail') || '').toString().replace(/\D/g, '');
    clearAllErrs(form);
    if (!code || tail.length !== 4) return showErr(form, T.err_cancel_data);

    busy(form, true, T.cancel_do);

    api('porca-cancel', { code: code, phone_tail: tail }).then(function (r) {
      busy(form, false, T.cancel_do);
      if (r.ok) {
        S.booking = null;
        renderCancelDone();
        return;
      }
      if (r.error === 'network') return showErr(form, T.err_network);
      if (r.error === 'not_found' || r.httpStatus === 404) {
        return showErr(form, r.message || T.cancel_404, !r.message);
      }
      if (r.error === 'rate_limited') return showErr(form, r.message || T.err_rate);
      showErr(form, r.message || T.err_generic, !r.message);
    });
  }

  /* ----------------------------------------------------------------- ics */

  // RFC 5545 §3.3.11: inside a TEXT value a comma is a list separator, a
  // semicolon separates parameters and a backslash escapes. Unescaped, the
  // address "Via del Trivio 31, 00061 Anguillara Sabazia RM" is three LOCATION
  // values to a strict parser, and the guest's calendar shows a fragment.
  function icsText(s) {
    return String(s == null ? '' : s)
      .replace(/([\\;,])/g, '\\$1')
      .replace(/\r?\n/g, '\\n');
  }

  function icsStamp(iso) {
    // iso is a real instant from the server; render it as UTC basic format.
    return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  // A data: URI, so "Aggiungi al calendario" is a plain link — it survives being
  // long-pressed, opened in another app, or shared, which a Blob URL does not.
  function icsHref(b) {
    if (!b || !b.starts_at) return '';
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Porca Porchetta//Prenotazioni//IT',
      'BEGIN:VEVENT',
      'UID:' + icsText(b.code) + '@porcaporchetta',
      'DTSTAMP:' + icsStamp(new Date().toISOString()),
      'DTSTART:' + icsStamp(b.starts_at),
      b.ends_at ? 'DTEND:' + icsStamp(b.ends_at) : '',
      'SUMMARY:' + icsText('Porca Porchetta — tavolo per ' + b.party),
      'LOCATION:' + icsText('Via del Trivio 31, 00061 Anguillara Sabazia RM'),
      'DESCRIPTION:' + icsText('Codice prenotazione ' + b.code + '. Tel ' + TEL_TEXT + '.'),
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean);
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
  }

  /* ---------------------------------------------------------------- boot */

  // Deep link from the confirmation e-mail:  /prenota.html?annulla=PP-XXXXX&t=1234
  // The pair (code, last 4 digits) is the cancel token — porca-cancel refuses
  // anything else with an indistinguishable "not found".
  function deepLinkCancel() {
    if (!window.location.search) return null;
    var q = new URLSearchParams(window.location.search);
    var code = (q.get('annulla') || '').trim().toUpperCase();
    if (!code) return null;
    return { code: code, tail: (q.get('t') || '').replace(/\D/g, '').slice(-4) };
  }

  // No backend wired up yet — or the anon key is still the placeholder in the
  // page — so show the phone, not a form that cannot possibly work.
  if (!API || !ANON || ANON.indexOf('PASTE_') === 0) {
    renderPhoneOnly();
    return;
  }

  var deep = deepLinkCancel();
  if (deep) {
    renderCancel(deep);
    return;
  }

  loadAvailability();
})();
