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
    if (bar) root.style.setProperty('--bar-h', Math.round(bar.offsetHeight) + 'px');
    if (rail) root.style.setProperty('--rail-h', Math.round(rail.offsetHeight) + 'px');
  }

  function watchSize() {
    measure();
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(measure);
      var bar = document.querySelector('.hdr');
      var rail = document.querySelector('.cats');
      if (bar) ro.observe(bar);
      if (rail) ro.observe(rail);
    } else {
      var t;
      window.addEventListener('resize', function () {
        clearTimeout(t);
        t = setTimeout(measure, 120);
      });
    }
  }

  /* ---------------------------------------------------------------------
     Reveals. Blocks marked .rev fade up once; photo frames marked .ph get
     their fallback unfurl here when the browser has no view() timeline.
     Siblings stagger so a grid does not pop all at once.
     --------------------------------------------------------------------- */
  function reveals() {
    var items = document.querySelectorAll('.rev, .ph');
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
        el.style.setProperty('--d', (idx > 0 ? idx * 90 : 0) + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    for (var j = 0; j < items.length; j++) io.observe(items[j]);
  }

  /* ---------------------------------------------------------------------
     Header state. Solid plate once the hero has left the top of the screen.
     A one pixel sentinel is watched instead of the scroll position.
     --------------------------------------------------------------------- */
  function barState() {
    var bar = document.querySelector('.hdr--over');
    var hero = document.querySelector('.hero');
    if (!bar || !hero) return;

    if (!hasIO) { bar.classList.add('is-stuck'); return; }

    var io = new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }, { rootMargin: '-72px 0px 0px 0px', threshold: 0 });

    io.observe(hero);
  }

  /* ---------------------------------------------------------------------
     The sticky chapter. The photograph is held by CSS position:sticky; this
     only swaps which frame is visible so the picture matches the passage
     being read. Under reduced motion the crossfade duration is zero (the
     stylesheet kills the transition) and the swap is instant.
     --------------------------------------------------------------------- */
  function chapter() {
    var stage = document.getElementById('stage');
    var steps = document.querySelectorAll('.chapter__step');
    if (!stage || !steps.length || !hasIO) return;

    var shots = stage.querySelectorAll('.chapter__shot');

    var io = new IntersectionObserver(function (entries) {
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

  /* ---------------------------------------------------------------------
     The three facts count up once. The final value is already in the markup,
     so with no JavaScript, no IntersectionObserver or reduced motion on, the
     numbers are simply there.
     --------------------------------------------------------------------- */
  function counters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length || !hasIO || reduce.matches) return;

    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (isNaN(target)) return;
      var suffix = el.getAttribute('data-suffix') || '';
      var dur = 900;
      var t0 = null;

      function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) window.requestAnimationFrame(frame);
      }

      el.textContent = '0' + suffix;
      window.requestAnimationFrame(frame);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.6 });

    for (var i = 0; i < nums.length; i++) io.observe(nums[i]);
  }

  /* ---------------------------------------------------------------------
     Menu page: highlight the category whose section is on screen, and keep
     that chip scrolled into view in the rail.
     --------------------------------------------------------------------- */
  function spy() {
    var rail = document.getElementById('cats');
    if (!rail || !hasIO) return;

    var links = rail.querySelectorAll('.cats__link');
    var inner = rail.querySelector('.cats__inner');
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
    barState();
    chapter();
    counters();
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
