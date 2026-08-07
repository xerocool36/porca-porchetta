/* ==========================================================================
   i18n. Italian is canonical and lives in the markup; it is snapshotted once
   at load from every [data-i18n] node, so switching back to it is lossless.
   Only English is a literal dictionary here.

   Product names the owner prints on his own boards (Ciavatta, Ciavattone,
   Taglierino, Taglierone, Tagliere apericena, esagerato, fraschetta,
   porchetta) are deliberately left in Italian in both languages. Wine, beer
   and cocktail names carry no key at all for the same reason. Where a word is
   identical in both languages (Tiramisù, Cheesecake, Caprese) the key still
   exists, so "not translated" is a decision on the record rather than an
   omission nobody noticed.

   The head is translated too. apply() used to walk only [data-i18n], so a
   document that declared lang="en" still carried an Italian <title>, an
   Italian meta description and og:locale=it_IT: a WCAG 3.1.1 mismatch and a
   wrong share card. The per page head strings live in META, keyed off
   <html data-i18n-page>.

   A missing key silently falls back to Italian, which is invisible in the
   browser, so this dictionary is kept exhaustive against the markup.
   ========================================================================== */
(function () {
  'use strict';

  var EN = {
    'skip': 'Skip to content',

    /* the enamel plates are quoted objects on their wall, so their wording is
       never translated; only the context line in front of them is */
    'targa.sr': 'Enamel plate hanging in the alley outside:',

    /* ---------------------------------------------------------------- nav */
    'nav.menu': 'Menu',
    'nav.book': 'Book',

    'cta.menuPrices': 'Menu and prices',
    'cta.wine': 'The wine list',
    'cta.call': 'Call',
    'cta.dir': 'Directions',

    /* --------------------------------------------------------------- hero */
    'hero.kicker': 'Anguillara Sabazia · Lake Bracciano',
    'hero.h1a': 'A fraschetta',
    'hero.h1b': 'cut into the tufo',
    'hero.lede': 'Porchetta carved to order, boards, sandwiches and wine by the jug. A hundred metres from Lake Bracciano.',

    /* ------------------------------------------------------------ apertura */
    'ap.title': 'The osteria of the Castelli, under Anguillara',
    'ap.sub': 'One room, the house wine, food brought to the table without ceremony. Here the room is a cave cut into the tufo: sixty covers under the old town. Closed on Monday.',

    /* -------------------------------------------------------------- grotta */
    'gr.t1': 'The entrance',
    'gr.p1': 'You come in from the alley, past the counter with the cured meats hanging above it. Via del Trivio 31, in the old town.',
    'gr.t2': 'The rooms',
    'gr.p2': 'The corridor runs down under the vaults: white stone, terrazzo floor, wooden tables. Sixty covers in all.',
    'gr.t3': 'The evening',
    'gr.p3': 'In summer the jasmine reaches the door and the enamel plates stay lit in the alley. You stay at the table until eleven.',

    /* ------------------------------------------------------------ a tavola */
    'tv.title': 'At the table',
    'tv.sub': 'Cured meats and cheeses sliced to order, hot porchetta, sandwiches and traditional dishes. The house wine is ordered by the glass, the quarter, the half litre or the litre.',
    'tv.c1t': 'The boards',
    'tv.c1d': 'From the taglierino for two to the tagliere apericena, which the menu marks as esagerato.',
    'tv.c2t': 'The porchetta',
    'tv.c2d': 'Carved to order: with warm bread, in tacos, or on the board with everything else.',
    'tv.c3t': 'Ciavatta and ciavattone',
    'tv.c3d': 'Two sizes of sandwich: porchetta, sausage, tripe or meatballs. Takeaway too.',
    'tv.c4t': 'On the plate',
    'tv.p1': 'Meatballs in tomato sauce',
    'tv.p2': 'Tripe',
    'tv.p3': 'Mixed bruschette',
    'tv.p4': 'Bresaola and rocket',
    'tv.p5': 'Caprese',
    'tv.p6': 'Chicory and turnip greens',
    'tv.wine': 'Seven whites and seven reds on the list, Frascati Superiore and Cesanese among them. Spritz is ordered by the jug, in three, five or eight litres.',

    /* ---------------------------------------------------------------- lago */
    'lg.title': 'The lake, a hundred metres away',
    'lg.p1': 'The ciavattone can be taken away. From the alley to the lakefront is a two minute walk, about as long as the sunset over Bracciano.',

    /* ------------------------------------------------------------- prenota */
    'pr.title': 'Book a table',
    'pr.sub': 'Sixty covers, and at the weekend they fill up. The confirmation reaches you by email within a minute.',
    'pr.alt': 'Groups of more than eight: <a href="tel:+390665495256">06 6549 5256</a>',

    /* --------------------------------------------------------- orari, dove */
    'in.title': 'Hours and contacts',
    'in.closed': 'Closed',

    'd.mon': 'Monday', 'd.tue': 'Tuesday', 'd.wed': 'Wednesday', 'd.thu': 'Thursday',
    'd.fri': 'Friday', 'd.sat': 'Saturday', 'd.sun': 'Sunday',

    /* -------------------------------------------------------------- footer */
    'ft.tag': 'A fraschetta in a tufo cave, in Anguillara Sabazia.',
    'ft.nav': 'The place',
    'ft.where': 'Where we are',
    'ft.hours': 'Hours',
    'ft.h1': 'Tue to Fri 17:00-23:00',
    'ft.h2': 'Sat and Sun 11:30-14:30 · 17:00-23:00',
    'ft.h3': 'Closed Monday',
    'ft.privacy': 'Privacy',
    'ft.credit': 'Site by',
    'ft.vat': 'VAT number to be added',
    'ft.addr': 'Via del Trivio, 31<br>\n          00061 Anguillara Sabazia, Rome<br>\n          <a href="tel:+390665495256">06 6549 5256</a>',
    'ft.addrmail': 'Via del Trivio, 31<br>\n          00061 Anguillara Sabazia, Rome<br>\n          <a href="tel:+390665495256">06 6549 5256</a><br>\n          <a href="mailto:Porcaporchetta2025@gmail.com">Porcaporchetta2025@gmail.com</a>',

    /* ===================================================== menu page: chrome */
    'm.title': 'The menu',
    'm.sub': 'Via del Trivio 31 · Anguillara Sabazia',

    'm.cat1': 'Boards',
    'm.cat2': 'On the plate',
    'm.cat3': 'Sandwiches',
    'm.cat4': 'Sides',
    'm.cat5': 'Kids',
    'm.cat6': 'Desserts',
    'm.cat7': 'Wine',
    'm.cat8': 'Jugs',
    'm.cat9': 'Beer',
    'm.cat10': 'Drinks',
    'm.cat11': 'Tris',

    /* ------------------------------------------------ menu page: dalla cucina */
    'm.di.porchetta': 'Porchetta',
    'm.di.salame': 'Cured meats',
    'm.di.bruschetta': 'Bruschette',
    'm.di.suppli': 'Fried',
    'm.di.bufala': 'Buffalo',
    'm.di.crudo': 'Prosciutto',
    'm.di.funghi': 'Mushrooms',
    'm.di.olive': 'Olives',

    /* ==================================================== menu page: bands */
    'm.t1': 'Our boards',
    'm.h1': 'Cured meats and cheeses sliced to order. All prices in euro.',

    'm.t2': 'On the plate',
    'm.h2': 'Traditional dishes, brought to the table to be shared.',

    'm.t3': 'Sandwiches',
    'm.h3': 'The ciavatta is the small size, the ciavattone the large one.',

    'm.t4': 'Sides',
    'm.h4': 'On the plate. To add them to a sandwich, the supplement is in the Sandwiches section.',

    'm.t5': 'Kids’ menu',
    'm.h5': 'One plate for the little ones.',

    'm.t6': 'Desserts',
    'm.h6': 'To finish.',

    'm.t7': 'Wine',
    'm.h7': 'Whites, reds and the house wine: by the glass, the quarter, the half litre or the litre.',

    'm.t8': 'Jugs and cocktails',
    'm.h8': 'Spritz is ordered by the litre.',

    'm.t9': 'Beer',
    'm.h9': 'Bottled and on draught.',

    'm.t10': 'Soft drinks and coffee',
    'm.h10': 'Soft drinks, coffee and, to finish, amari and spirits.',

    'm.t11': 'While you wait',
    'm.h11': 'The same game printed on the paper mat on your table.',

    /* -------------------------------------------- menu page: group headings */
    'm.g.altri': 'Other sandwiches',
    'm.g.aggiunte': 'Sides to add',
    'm.g.bianchi': 'White',
    'm.g.rossi': 'Red',
    'm.g.casa': 'House wine',
    'm.g.caraffe': 'Jugs of spritz',
    'm.g.cocktail': 'Cocktails',
    'm.g.bottiglia': 'Bottled',
    'm.g.spina': 'On draught',
    'm.g.bibite': 'Soft drinks and coffee',
    'm.g.distillati': 'Amari and spirits',

    'm.th.panino': 'Sandwich',
    'm.th.contorno': 'Side',
    /* the two bread sizes are the owner's own product names, so they stay
       Italian; the column header adds the size in English, once */
    'm.th.ciavatta': 'Ciavatta (small)',
    'm.th.ciavattone': 'Ciavattone (large)',
    /* the screen-reader-only prefix in front of every price in those tables:
       the product name, not a translation of it */
    'm.sr.ciavatta': 'Ciavatta ',
    'm.sr.ciavattone': 'Ciavattone ',

    /* ------------------------------------- menu page: descriptions and notes */
    'm.d.salumi': 'A selection of cured meats and cheeses',
    'm.d.apericena': 'Hot bites, cured meats, cheeses, porchetta, buffalo mozzarella, bruschette',
    'm.d.fresco': 'Caprese, panzanella, chicken salad, fresh cheeses, cured meats, prosciutto and buffalo mozzarella',
    'm.d.bimbi': 'Breaded cutlet, fries and a drink',

    'm.n.due': 'for 2 people',
    'm.n.2pz': '2 pcs',
    'm.n.4pz': '4 pcs',
    'm.novita': 'new',
    'm.esagerato': 'esagerato',

    'm.off.eyebrow': 'Offer',
    'm.off.t': 'Maxi tagliere',
    'm.off.min': 'Minimum 4 people',
    'm.off.o1': 'Large board of cured meats and cheeses, buffalo mozzarella and porchetta <b>+</b> a 5-litre jug of spritz',
    'm.off.o2': 'Large board of cured meats and cheeses, buffalo mozzarella and porchetta · drinks not included',
    'm.off.pp': 'per person',

    'm.pn.supp': 'The prices for sides to add are the supplement per sandwich.',
    'm.pn.note': 'Any sandwich can be filled with any side, cheese or cured meat.',

    'm.allerg': 'If you have an allergy or an intolerance, please tell the staff before ordering: we will tell you exactly what is in each dish.',

    /* ----------------------------------------------------- menu page: items */
    'm.i.frutta': 'Fruit board',
    'm.i.fresco': 'Fresh board',

    'm.i.tacos': 'Porchetta tacos',
    'm.i.polpsugo': 'Meatballs in tomato sauce',
    'm.i.polpfritte': 'Fried meatballs',
    'm.i.porchettapane': 'Porchetta with warm bread',
    'm.i.trippa': 'Tripe',
    'm.i.bufalacrudo': 'Buffalo mozzarella and prosciutto crudo',
    'm.i.focaccia': 'Focaccia with oil, salt and rosemary',
    'm.i.bruschette': 'Mixed bruschette',
    'm.i.bresaola': 'Bresaola and rocket',
    'm.i.pollo': 'Chicken salad',
    'm.i.caprese': 'Caprese',

    'm.i.salsiccia': 'Sausage',
    'm.i.porchetta': 'Porchetta',

    'm.i.cicoria': 'Chicory',
    'm.i.broccoletti': 'Turnip greens',
    'm.i.melanzane': 'Aubergine',
    'm.i.peperoni': 'Peppers',
    'm.i.zucchine': 'Courgette',
    'm.i.secchi': 'Sun-dried tomatoes',
    'm.i.bufala': 'Buffalo mozzarella',
    'm.i.patatine': 'Fries',
    'm.i.delgiorno': 'Side of the day',

    'm.i.bimbi': 'Kids’ menu',
    'm.i.tiramisu': 'Tiramisù',
    'm.i.pannacotta': 'Panna cotta',
    'm.i.cheesecake': 'Cheesecake',
    'm.i.ciambelline': 'Ciambelline al vino, served with wine',

    'm.i.calice': 'Glass',
    'm.i.q4': 'Quarter litre',
    'm.i.q2': 'Half litre',
    'm.i.q1': 'One litre',
    'm.i.car3': '3 l jug',
    'm.i.car5': '5 l jug',
    'm.i.car8': '8 l jug',

    'm.i.ichnusa': 'Ichnusa unfiltered',
    'm.i.chiarap': 'Lager, small',
    'm.i.chiaram': 'Lager, medium',

    'm.i.caffecorr': 'Espresso with a dash of liquor',
    'm.i.acquap': 'Water, small',
    'm.i.acquag': 'Water, large',
    'm.i.cocagrande': 'Coca Cola 1.5 l',
    'm.i.grappab': 'Barrel-aged grappa',

    /* ================================================= prenota page: chrome */
    'pn.title': 'Book a table in the cave',
    'pn.sub': 'Pick the day, the time and how many of you there are. The confirmation reaches you by email with the code: if something changes, the booking can be cancelled from there.',
    'pn.langnote': 'The booking form below is in Italian. To book in English, please call <a href="tel:+390665495256">06 6549 5256</a>.',
    'pn.good': 'Worth knowing',
    'pn.g1': '<strong>We hold the table for about fifteen minutes.</strong> If you are running late, call and we will move it.',
    'pn.g2': '<strong>For groups of more than eight</strong> the tables are laid out by hand: the number is <a href="tel:+390665495256">06 6549 5256</a>.',
    'pn.g3': '<strong>We are closed on Monday.</strong> Tuesday to Friday evenings only, Saturday and Sunday lunch as well.',
    'pn.sum': 'Your table',
    'pn.day': 'Day',
    'pn.time': 'Time',
    'pn.people': 'People',
    'pn.who': 'In the name of',
    'pn.note': 'All times are Rome time.<br>\n            Via del Trivio 31, Anguillara Sabazia. Sixty covers cut into the tufo.',

    /* ================================================= privacy page: chrome */
    'pv.sub': 'What the booking form collects, why, where it ends up and how long it stays. No filler clauses: only what this site actually does.',
    'pv.updated': 'Last updated: 6 August 2026',
    'pv.langnote': 'The notice below is in Italian: that is the version that counts.',

    /* ------------------------------------------------------------ the tris */
    'tris.turn': 'Your turn',
    'tris.win': 'You won.',
    'tris.lose': 'You lost.',
    'tris.draw': 'A draw.',
    'tris.again': 'Play again',
    /* Board cell label, read by screen readers as "Square 4". tris.js builds
       the number, so this is the noun on its own. */
    'tris.cell': 'Square'
  };

  /* Head strings, per page. Same fallback rule: no entry means Italian. */
  var META = {
    index: {
      title: 'Porca Porchetta, a fraschetta in Anguillara Sabazia',
      description: 'A fraschetta in a tufo cave in the old town of Anguillara Sabazia, a hundred metres from Lake Bracciano. Porchetta, boards, sandwiches and wine by the jug. Sixty covers, book online.',
      ogTitle: 'Porca Porchetta, a fraschetta in Anguillara Sabazia',
      ogDescription: 'Porchetta, boards and wine by the jug in a tufo cave, a hundred metres from Lake Bracciano.'
    },
    menu: {
      title: 'Menu, Porca Porchetta in Anguillara Sabazia',
      description: 'The Porca Porchetta menu: boards of cured meats and cheeses, porchetta and traditional dishes, ciavatta and ciavattone sandwiches, sides, desserts, wines from Lazio, beer and jugs of spritz. Via del Trivio 31, Anguillara Sabazia.',
      ogTitle: 'Menu, Porca Porchetta',
      ogDescription: 'Boards, porchetta, sandwiches, sides, desserts, wine by the jug and jugs of spritz. Via del Trivio 31, Anguillara Sabazia.'
    },
    prenota: {
      title: 'Book a table, Porca Porchetta in Anguillara Sabazia',
      description: 'Book a table in the tufo cave at Porca Porchetta, Anguillara Sabazia: pick the day, the time and how many of you there are. Confirmation by email with the code to cancel. The booking form is in Italian.',
      ogTitle: 'Book a table, Porca Porchetta',
      ogDescription: 'Sixty covers in a tufo cave in Anguillara Sabazia. Pick a day and a time, the confirmation arrives by email.'
    },
    privacy: {
      title: 'Privacy, Porca Porchetta in Anguillara Sabazia',
      description: 'Porca Porchetta privacy notice: what the booking form collects, why, where it ends up, how long it stays and how to delete it. The notice itself is in Italian.',
      ogTitle: 'Privacy, Porca Porchetta',
      ogDescription: 'How we handle the data collected when you book a table online.'
    }
  };

  /* Strings created at runtime by tris.js have no element in the markup to be
     snapshotted from, so their Italian source lives here. */
  var IT_RUNTIME = {
    'tris.turn': 'Il tuo turno',
    'tris.win': 'Partita vinta.',
    'tris.lose': 'Partita persa.',
    'tris.draw': 'Pareggio.',
    'tris.again': 'Rigioca',
    'tris.cell': 'Casella'
  };

  var store = { it: null, en: EN };
  var metaIT = null;
  var page = document.documentElement.getAttribute('data-i18n-page') || '';

  function metaEl(sel) { return document.head ? document.head.querySelector(sel) : null; }

  /* Snapshot the Italian markup and head once, so switching back is lossless. */
  function snapshotIT() {
    if (store.it) return;
    store.it = {};
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      store.it[el.getAttribute('data-i18n')] = el.innerHTML;
    });

    var d = metaEl('meta[name="description"]');
    var ot = metaEl('meta[property="og:title"]');
    var od = metaEl('meta[property="og:description"]');
    metaIT = {
      title: document.title,
      description: d ? d.getAttribute('content') : null,
      ogTitle: ot ? ot.getAttribute('content') : null,
      ogDescription: od ? od.getAttribute('content') : null
    };
  }

  function applyHead(lang) {
    var src = lang === 'en' ? META[page] : metaIT;
    if (!src) src = metaIT;

    if (src.title) document.title = src.title;

    [['meta[name="description"]', 'description'],
     ['meta[property="og:title"]', 'ogTitle'],
     ['meta[property="og:description"]', 'ogDescription']
    ].forEach(function (pair) {
      var el = metaEl(pair[0]);
      var v = src[pair[1]];
      if (el && typeof v === 'string') el.setAttribute('content', v);
    });

    var loc = metaEl('meta[property="og:locale"]');
    if (loc) loc.setAttribute('content', lang === 'en' ? 'en_GB' : 'it_IT');
  }

  function apply(lang) {
    snapshotIT();
    var dict = lang === 'en' ? store.en : store.it;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      var v = dict[k];
      if (typeof v === 'string') el.innerHTML = v;
      else if (lang === 'en' && store.it[k]) el.innerHTML = store.it[k]; // untranslated: keep IT
    });

    /* the document's declared language, its title and its share card have to
       agree, or a screen reader reads an Italian title in an English voice */
    document.documentElement.lang = lang;
    applyHead(lang);

    document.querySelectorAll('.lang__btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });

    try { localStorage.setItem('pp-lang', lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent('pp:lang', { detail: { lang: lang } }));
  }

  /* Italian is the default, full stop. Sniffing navigator.language would greet
     a Roman with an English browser in English, which is wrong for a fraschetta
     whose customers are overwhelmingly local. Visitors get EN via the toggle or
     ?lang=en, and the choice is then remembered. */
  function initial() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'it') return q;
    try {
      var s = localStorage.getItem('pp-lang');
      if (s === 'en' || s === 'it') return s;
    } catch (e) {}
    return 'it';
  }

  window.PP_I18N = {
    apply: apply,
    t: function (key) {
      var lang = document.documentElement.lang === 'en' ? 'en' : 'it';
      if (lang === 'en' && EN[key]) return EN[key];
      return (store.it && store.it[key]) || IT_RUNTIME[key] || key;
    }
  };

  /* This file is loaded at the end of <body>, so the document is already
     parsed when it runs: the stored language is applied here and now rather
     than on DOMContentLoaded. Waiting is what made a visitor with pp-lang=en
     watch the page paint in Italian and then flip. */
  function start() {
    snapshotIT();
    document.querySelectorAll('.lang__btn').forEach(function (b) {
      b.addEventListener('click', function () { apply(b.dataset.lang); });
    });
    var lang = initial();
    if (lang !== 'it') apply(lang);
  }

  /* readyState is still 'loading' for a script at the end of <body>, so that
     is the wrong test: what matters is that <body> has been parsed. */
  if (document.body) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
})();
