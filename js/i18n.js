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

    'cta.dir': 'Find us',
    'cta.dir2': 'Directions',
    'cta.call': 'Call',
    'cta.menu': 'See the menu',

    'hero.h1': 'Dripping<br>porchetta',
    'hero.strip': 'Boards that weigh · 5 litres of spritz',
    'hero.rating': '4.7★',
    'hero.m1': 'Fraschetta · Anguillara Sabazia',
    'hero.m2': 'from 63 Google reviews',
    'hero.m3': 'Closed Mondays',

    'fr.eyebrow': 'Via del Trivio 31 · old town',
    'fr.title': 'You eat<br>inside the cave',
    'fr.p1': 'It is not set dressing: it is real tufo rock, dug out under the old town of Anguillara. White vaults, stone walls, wooden tables, a few trailing vines and two neon signs. You come in for a sandwich and leave three hours later.',
    'fr.p2': 'A fraschetta is the Roman thing where the charcuterie board lands before you have finished ordering, and the wine comes in a jug because nobody here has time for small glasses.',
    'fr.f1': 'Tables inside the rock',
    'fr.f2': 'A hundred metres from Lake Bracciano',
    'fr.f3': 'Takeaway too',

    'tg.eyebrow': 'What people come for',
    'tg.title': 'Our<br>boards',
    'tg.sub': 'Cured meats, cheeses, buffalo mozzarella, porchetta, bruschette. It fills up as you scroll.',
    'tg.i1': 'A selection of cured meats and cheeses',
    'tg.i2': 'A selection of cured meats and cheeses · for 2',
    'tg.i3': 'Hot bites, cured meats, cheeses, porchetta, buffalo mozzarella, bruschette · for 2',
    'tg.min': 'Minimum 4 people',
    'tg.o1': 'Large board of cured meats and cheeses, buffalo mozzarella and porchetta <b>+</b> a 5-litre jug of spritz',
    'tg.o2': 'Large board of cured meats and cheeses, buffalo mozzarella and porchetta · drinks not included',
    'tg.pp': 'per person',

    'pn.eyebrow': 'Ciavatta or ciavattone',
    'pn.title': 'Filthy<br>sandwiches',
    'pn.sub': 'Two sizes. The second one is the right one.',
    'pn.porchetta': 'With porchetta',
    'pn.salsiccia': 'With sausage',
    'pn.trippa': 'With tripe',
    'pn.contorni': 'Add a side',
    'pn.secchi': 'Sun-dried tomatoes <b>+1</b>',
    'pn.bufala': 'Buffalo mozzarella <b>+2</b>',
    'pn.note': 'Any sandwich can be filled with any side, cheese or cured meat.',

    'cr.eyebrow': 'Proper aperitivo',
    'cr.title': 'Jugs<br>of spritz',
    'cr.sub': 'Ordered by the litre, not by the glass. Three at the very least.',
    'cr.note': 'Beers, wine and desserts — including Martina’s tiramisù — just ask at the table.',

    'lg.eyebrow': 'A hundred metres',
    'lg.title': 'And then<br>the lake',
    'lg.p1': 'Take the ciavattone to go, walk down to the lakefront, and the sunset over Bracciano does the rest. The spritz in a plastic cup is not a compromise: it is the plan.',

    'in.title': 'Hours<br>& address',
    'in.closed': 'Closed',
    'in.stamp': 'Closed Mondays',

    'd.mon': 'Monday', 'd.tue': 'Tuesday', 'd.wed': 'Wednesday', 'd.thu': 'Thursday',
    'd.fri': 'Friday', 'd.sat': 'Saturday', 'd.sun': 'Sunday',

    'ft.tag': 'Porchetta · Filthy sandwiches · Proper aperitivo',
    'ft.where': 'Address',
    'ft.contact': 'Contact',
    'ft.vat': 'VAT number to be added',

    /* menu page */
    'm.title': 'The menu',
    'm.sub': 'Via del Trivio 31 · Anguillara Sabazia · Closed Mondays',
    'm.back': 'Home',
    'm.cat1': 'Boards', 'm.cat2': 'Sandwiches', 'm.cat3': 'Sides', 'm.cat4': 'Spritz', 'm.cat5': 'Tris',
    'm.t1': 'Our boards',
    'm.h1': 'Everything sliced to order.',
    'm.t2': 'Filthy sandwiches',
    'm.h2': 'Ciavatta is the small one, ciavattone is the serious one.',
    'm.t3': 'Sides to add',
    'm.h3': 'On any sandwich, or on the side.',
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
