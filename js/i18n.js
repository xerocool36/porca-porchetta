/* ==========================================================================
   i18n — Italian is canonical, English is a real translation.
   The romanesco lines stay in Italian in both languages: translating dialect
   kills the joke. In EN a speech bubble glosses them instead.
   ========================================================================== */
(function () {
  'use strict';

  var EN = {
    'skip': 'Skip to content',
    'nav.menu': 'Menu',

    'cta.dir': 'How to get here',
    'cta.dir2': 'Directions',
    'cta.call': 'Call',
    'cta.menu': 'The menu',
    'cta.menuPrices': 'Menu and prices',

    'hero.h1': 'Dripping<br>porchetta',
    'hero.lede': 'Inside a tufo cave in the old town of Anguillara, a hundred metres from the lake.',
    'hero.cue': 'Down into the cave',

    'fr.eyebrow': 'Via del Trivio 31 · old town',
    'fr.title': 'You eat<br>inside the cave',
    'fr.p1': 'Not a stage set: it is tufo, dug out under the old town of Anguillara. White vaults, stone walls, wooden tables, two neon signs and the ivy. You come in for a sandwich and leave three hours later.',
    'fr.p2': 'A fraschetta is the Roman thing where the board lands before you have finished ordering, and the wine comes in a jug because nobody here has time for small glasses.',
    'fr.f1': 'Tables inside the rock',
    'fr.f2': 'A hundred metres from the lake',
    'fr.f3': 'Takeaway too',

    'tg.eyebrow': 'What people come for',
    'tg.title': 'Our<br>boards',
    'tg.sub': 'It fills up as you scroll. From the small board for a couple of drinks to the apericena board that the menu, quite rightly, calls "esagerato".',
    'tg.b1': 'Cured meats, sliced to order',
    'tg.b2': 'Cheeses and buffalo mozzarella',
    'tg.b3': 'Porchetta, the reason we are here',
    'tg.b4': 'Bruschette, crostini and hot fried bites',
    'tg.note': 'For two people or for eight: the board gets longer and a jug arrives.',
    'tg.i1': 'A selection of cured meats and cheeses',
    'tg.i2': 'A selection of cured meats and cheeses · for 2',
    'tg.i3': 'Hot bites, cured meats, cheeses, porchetta, buffalo mozzarella, bruschette · for 2',
    'tg.min': 'Minimum 4 people',
    'tg.o1': 'Large board of cured meats and cheeses, buffalo mozzarella and porchetta <b>+</b> a 5-litre jug of spritz',
    'tg.o2': 'Large board of cured meats and cheeses, buffalo mozzarella and porchetta · drinks not included',
    'tg.pp': 'per person',

    'pn.eyebrow': 'Ciavatta or ciavattone',
    'pn.title': 'Filthy<br>sandwiches',
    'pn.sub': 'Two sizes: the ciavatta for lunch, the ciavattone when you mean it. Porchetta, sausage or tripe.',
    'pn.salsiccia': 'Sausage',
    'pn.trippa': 'Tripe',
    'pn.porchetta': 'With porchetta',
    'pn.contorni': 'Sides to add',
    'pn.secchi': 'Sun-dried tomatoes',
    'pn.bufala': 'Buffalo mozzarella',
    'pn.note': 'Any sandwich can be filled with any side, cheese or cured meat.',

    'cr.eyebrow': 'Proper aperitivo',
    'cr.title': 'Jugs<br>of spritz',
    'cr.sub': 'Ordered by the litre, not by the glass. Three, five or eight — then it is up to you.',
    'cr.lt': 'litres',
    'cr.note': 'Beers, wine and desserts — including Martina’s tiramisù — just ask at the table.',

    'lg.eyebrow': 'A hundred metres',
    'lg.title': 'And then<br>the lake',
    'lg.p1': 'Take the ciavattone to go, walk down to the lakefront, and at sunset Bracciano handles the rest. The spritz in a plastic cup is not a compromise: it is the plan.',

    'in.title': 'Hours<br>& address',
    'in.closed': 'Closed',
    'in.stamp': 'Closed Mondays',

    'd.mon': 'Monday', 'd.tue': 'Tuesday', 'd.wed': 'Wednesday', 'd.thu': 'Thursday',
    'd.fri': 'Friday', 'd.sat': 'Saturday', 'd.sun': 'Sunday',

    'ft.tag': 'Porchetta · Filthy sandwiches · Proper aperitivo',
    'ft.where': 'Where we are',
    'ft.contact': 'Contact',
    'ft.hours': 'Hours',
    'ft.h1': 'Tue–Fri 17:00–23:00',
    'ft.h2': 'Sat–Sun 11:30–14:30 · 17:00–23:00',
    'ft.h3': 'Closed Monday',
    'ft.map': 'The map',
    'ft.open': 'Open directions',
    'ft.credit': 'Site by',
    'ft.vat': 'VAT number to be added',

    /* menu page */
    'm.title': 'The menu',
    'm.sub': 'Via del Trivio 31 · Anguillara Sabazia',
    'm.back': 'Home',
    'm.cat1': 'Boards', 'm.cat2': 'Sandwiches', 'm.cat3': 'Sides', 'm.cat4': 'Spritz', 'm.cat5': 'Tris',
    'm.t1': 'Our boards',
    'm.h1': 'Sliced to order.',
    'm.t2': 'Filthy sandwiches',
    'm.h2': 'Ciavatta is the small one, ciavattone is the serious one.',
    'm.t3': 'Sides',
    'm.h3': 'In the sandwich or on the side.',
    'm.secchi': 'Sun-dried tomatoes',
    'm.bufala': 'Buffalo mozzarella',
    'm.t4': 'Jugs of spritz',
    'm.h4': 'By the litre.',
    'm.t5': 'While you wait',
    'm.h5': 'The same game printed on the paper placemat in front of you.',
    'm.allerg': 'Allergies or intolerances? Tell the staff before ordering — we will tell you exactly what is in it.',
    'm.ask': 'Beers, wine, soft drinks and desserts change often: ask at the table.',
    'm.size.s': 'Ciavatta',
    'm.size.l': 'Ciavattone',

    'tris.turn': 'Your turn',
    'tris.win': 'You won. Porca porchetta.',
    'tris.lose': 'The pig wins.',
    'tris.draw': 'Draw. Order another jug.',
    'tris.again': 'Play again'
  };

  /* Strings created at runtime by tris.js have no element in the markup to be
     snapshotted from, so their Italian source lives here. */
  var IT_RUNTIME = {
    'tris.turn': 'Tocca a te',
    'tris.win': 'Hai vinto. Porca porchetta.',
    'tris.lose': 'Vince il maiale.',
    'tris.draw': 'Pari. Ordina un’altra caraffa.',
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

    /* the dialect gloss only exists in English */
    var gloss = document.getElementById('glossHero');
    if (gloss) gloss.hidden = (lang !== 'en');

    document.querySelectorAll('.lang__btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });

    try { localStorage.setItem('pp-lang', lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent('pp:lang', { detail: { lang: lang } }));
  }

  /* Italian is the default, full stop. Sniffing navigator.language would greet
     a Roman with an English browser in English — wrong for a fraschetta whose
     customers are overwhelmingly local. Tourists get EN via the toggle or
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
