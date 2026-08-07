/* Porca Porchetta, page behaviour.

   Vanilla, no dependencies, no smooth scroll library: the QR menu has to paint
   fast on a phone underground, and scroll hijacking makes touch feel worse.

   There is no scroll listener in this file. Everything that reacts to the
   scroll position does it with IntersectionObserver, and the photographs use
   CSS scroll driven animation where the browser has it (see css/style.css,
   section 24). prefers-reduced-motion switches the whole layer off: the
   .js-anim class is never added, so none of the animated rules ever match. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasIO = 'IntersectionObserver' in window;

  /* Added synchronously, before first paint, so the entrance animations never
     flash their end state first. Under reduced motion it is never added and
     every animated rule in the stylesheet stops matching. */
  if (!reduce.matches) document.documentElement.classList.add('js-anim');

  /* ---------------------------------------------------------------------
     Measured chrome heights. Sticky offsets and scroll-margins are written
     as custom properties instead of hard coded numbers, so they stay right
     when the header wraps or the font loads at a different size.
     --------------------------------------------------------------------- */
  function measure() {
    var root = document.documentElement;
    var bar = document.querySelector('.hdr');
    var rail = document.querySelector('.cats');
    var dock = document.querySelector('.dock');
    if (bar) root.style.setProperty('--bar-h', Math.round(bar.offsetHeight) + 'px');
    if (rail) root.style.setProperty('--rail-h', Math.round(rail.offsetHeight) + 'px');
    /* The dock is 67px plus env(safe-area-inset-bottom), which is 34px on a
       notched iPhone: a hard coded 76px reserve buries the last line of the
       footer under it. Measured, like the other two. */
    if (dock) root.style.setProperty('--dock-h', Math.round(dock.offsetHeight) + 'px');
  }

  function watchSize() {
    measure();
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(measure);
      var bar = document.querySelector('.hdr');
      var rail = document.querySelector('.cats');
      var dock = document.querySelector('.dock');
      if (bar) ro.observe(bar);
      if (rail) ro.observe(rail);
      if (dock) ro.observe(dock);
    } else {
      var t;
      window.addEventListener('resize', function () {
        clearTimeout(t);
        t = setTimeout(measure, 120);
      });
    }
  }

  /* ---------------------------------------------------------------------
     Reveals. Section heads marked .rev fade up once, and each .targa swings
     into place once. Photographs are not in this set any more: they settle
     against the scroll position in CSS where the browser has view(), and
     otherwise simply appear. Siblings stagger so a group does not pop at once.
     --------------------------------------------------------------------- */
  function reveals() {
    var items = document.querySelectorAll('.rev, .targa');
    if (!items.length) return;

    if (!hasIO || reduce.matches) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sibs = el.parentNode ? el.parentNode.querySelectorAll(':scope > .rev') : [];
        var idx = Array.prototype.indexOf.call(sibs, el);
        el.style.setProperty('--d', (idx > 0 ? idx * 70 : 0) + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    for (var j = 0; j < items.length; j++) io.observe(items[j]);
  }

  /* The header used to float transparent over a full bleed photographic hero
     and swap to a solid plate past it, watched with an IntersectionObserver
     sentinel. The hero is a light typographic panel now, so the bar is simply
     solid from the first pixel and there is no state left to manage. */

  /* ---------------------------------------------------------------------
     The sticky chapter. The photograph is held by CSS position:sticky; this
     only swaps which frame is visible so the picture matches the passage
     being read. Under reduced motion the crossfade duration is zero (the
     stylesheet kills the transition) and the swap is instant.
     --------------------------------------------------------------------- */
  function chapter() {
    var section = document.getElementById('grotta');
    var stage = document.getElementById('stage');
    var steps = document.querySelectorAll('.chapter__step');
    if (!section || !stage || !steps.length) return;

    var shots = stage.querySelectorAll('.chapter__shot');
    var io = null;

    // Phones do not get the sticky stage. A held photograph swapping under
    // three passages needs a tall viewport to read as one camera move; on a
    // 390px screen it is half the screen pinned in place while text slides
    // past it, which is the one piece of motion on this site that made a
    // person feel something was wrong with the page. Down here each passage
    // simply carries its own picture and the section scrolls like a page.
    // The nodes MOVE rather than being duplicated: one download either way.
    var wide = window.matchMedia('(min-width: 900px)');

    function toFlow() {
      section.classList.add('chapter--flow');
      for (var i = 0; i < steps.length; i++) {
        var n = steps[i].getAttribute('data-step');
        for (var j = 0; j < shots.length; j++) {
          if (shots[j].getAttribute('data-shot') === n) {
            steps[i].insertBefore(shots[j], steps[i].firstChild);
          }
        }
      }
      if (io) { io.disconnect(); io = null; }
    }

    function toStage() {
      section.classList.remove('chapter--flow');
      for (var k = 0; k < shots.length; k++) stage.appendChild(shots[k]);
      if (io || !hasIO) return;
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var n = e.target.getAttribute('data-step');
          for (var i = 0; i < shots.length; i++) {
            shots[i].classList.toggle('is-on', shots[i].getAttribute('data-shot') === n);
          }
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      for (var s = 0; s < steps.length; s++) io.observe(steps[s]);
    }

    function sync() { if (wide.matches) toStage(); else toFlow(); }

    sync();
    if (wide.addEventListener) wide.addEventListener('change', sync);
    else if (wide.addListener) wide.addListener(sync);   // Safari < 14
  }

  /* ---------------------------------------------------------------------
     Menu page: highlight the category whose section is on screen, keep that
     chip scrolled into view in the rail, and slide the indicator bar under
     it. The bar is one element driven by two custom properties, so the state
     moves continuously instead of a filled pill jumping between chips that
     can be 400px apart inside a scroller.
     --------------------------------------------------------------------- */
  function spy() {
    var rail = document.getElementById('cats');
    if (!rail || !hasIO) return;

    var links = rail.querySelectorAll('.cats__link');
    var inner = rail.querySelector('.cats__inner');
    var bar = rail.querySelector('.cats__bar');
    var map = {};
    var watched = [];

    links.forEach(function (a) {
      var id = (a.getAttribute('href') || '').replace(/^#/, '');
      var sec = id && document.getElementById(id);
      if (!sec) return;
      map[id] = a;
      watched.push(sec);
    });
    if (!watched.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var a = map[e.target.id];
        if (!a) return;
        links.forEach(function (l) { l.classList.remove('is-on'); });
        a.classList.add('is-on');
        if (bar) {
          bar.style.setProperty('--x', a.offsetLeft + 'px');
          bar.style.setProperty('--w', a.offsetWidth);
        }
        if (inner) {
          var want = a.offsetLeft - (inner.clientWidth - a.offsetWidth) / 2;
          inner.scrollTo({ left: Math.max(want, 0), behavior: reduce.matches ? 'auto' : 'smooth' });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    watched.forEach(function (s) { io.observe(s); });
  }

  /* Mark today's row in the opening hours list. */
  function today() {
    var list = document.getElementById('hours');
    if (!list) return;
    var d = String(new Date().getDay());
    var row = list.querySelector('.orari__row[data-day="' + d + '"]');
    if (row) row.classList.add('is-today');
  }

  function year() {
    var el = document.getElementById('yr');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function init() {
    watchSize();
    reveals();
    chapter();
    spy();
    today();
    year();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
