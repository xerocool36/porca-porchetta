/* ==========================================================================
   i18n. Italian is canonical and lives in the markup; it is snapshotted once
   at load from every [data-i18n] node, so switching back to it is lossless.
   Only English is a literal dictionary here.

   Product names the owner prints on his own boards (Ciavatta, Ciavattone,
   Taglierino, Taglierone, Tagliere apericena, esagerato, fraschetta,
   porchetta) are deliberately left in Italian in both languages. Wine, beer
   and cocktail names carry no key at all for the same reason.

   A missing key silently falls back to Italian, which is invisible in the
   browser, so this dictionary is kept exhaustive against index.html and
   menu.html on purpose.
   ========================================================================== */
(function () {
  'use strict';

  var EN = {
    'skip': 'Skip to content',

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
    'ap.sub': 'One room, the house wine, food brought to the table without ceremony. Here the room is a cave cut into the tufo.',
    'ap.s1': 'covers in the cave',
    'ap.s2': 'from Lake Bracciano',
    'ap.s3': 'days a week, closed Monday',

    /* -------------------------------------------------------------- grotta */
    'gr.t1': 'The entrance',
    'gr.p1': 'You come in from the alley, past the counter with the cured meats hanging above it. Via del Trivio 31, in the old town.',
    'gr.t2': 'The rooms',
    'gr.p2': 'The corridor runs down under the vaults: white stone, terrazzo floor, wooden tables. Sixty covers in all.',
    'gr.t3': 'The evening',
    'gr.p3': 'In summer the jasmine reaches the door. You stay at the table until eleven.',

    /* ------------------------------------------------------------ a tavola */
    'tv.title': 'At the table',
    'tv.sub': 'Cured meats and cheeses sliced to order, hot porchetta, sandwiches and traditional dishes.',
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

    /* ----------------------------------------------------------- in caraffa */
    'bv.title': 'By the jug',
    'bv.sub': 'The house wine is ordered by the glass, the quarter, the half litre or the litre.',
    'bv.g1': 'House wine',
    'bv.g1a': 'Glass',
    'bv.g1b': 'Quarter litre',
    'bv.g1c': 'Half litre',
    'bv.g1d': 'Litre',
    'bv.g2': 'On the list',
    'bv.g2c': 'Seven whites and seven reds',
    'bv.g3': 'Jugs and draught',
    'bv.g3a': 'Spritz in 3, 5 and 8 litre jugs',
    'bv.g3b': 'Draught lager',
    'bv.g3c': 'Amari, grappa, genziana',

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

    /* ------------------------------------- menu page: descriptions and notes */
    'm.d.salumi': 'A selection of cured meats and cheeses',
    'm.d.apericena': 'Hot bites, cured meats, cheeses, porchetta, buffalo mozzarella, bruschette',
    'm.d.fresco': 'Caprese, panzanella, chicken salad, fresh cheeses, cured meats, prosciutto and buffalo mozzarella',
    'm.d.bimbi': 'Breaded cutlet, fries and a drink',

    'm.n.due': 'for 2 people',
    'm.n.2pz': '2 pcs',
    'm.n.4pz': '4 pcs',
    'm.novita': 'new',

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
    'm.i.ciambelline': 'Ciambelline al vino, served with wine',

    'm.i.calice': 'Glass',
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

    /* ------------------------------------------------------------ the tris */
    'tris.turn': 'Your turn',
    'tris.win': 'You won.',
    'tris.lose': 'You lost.',
    'tris.draw': 'A draw.',
    'tris.again': 'Play again'
  };

  /* Strings created at runtime by tris.js have no element in the markup to be
     snapshotted from, so their Italian source lives here. */
  var IT_RUNTIME = {
    'tris.turn': 'Il tuo turno',
    'tris.win': 'Partita vinta.',
    'tris.lose': 'Partita persa.',
    'tris.draw': 'Pareggio.',
    'tris.again': 'Rigioca'
  };

  var store = { it: null, en: EN };

  /* Snapshot the Italian markup once, so switching back is lossless. */
  function snapshotIT() {
    if (store.it) return;
    store.it = {};
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      store.it[el.getAttribute('data-i18n')] = el.innerHTML;
    });
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

    document.documentElement.lang = lang;

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

  document.addEventListener('DOMContentLoaded', function () {
    snapshotIT();
    document.querySelectorAll('.lang__btn').forEach(function (b) {
      b.addEventListener('click', function () { apply(b.dataset.lang); });
    });
    var start = initial();
    if (start !== 'it') apply(start);
  });
})();
