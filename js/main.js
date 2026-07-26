/* ==========================================================================
   main.js — no dependencies, no CDN, no third-party requests.
   Everything here is progressive: with JS off the page is fully readable and
   every price, hour and phone number is already in the HTML.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------- jitter
     Hand-set lettering. Deterministic per character index, so the same word
     always looks the same — a random seed per load would read as a glitch.
     This is a static transform, not an animation, so it stays on under
     reduced-motion. */
  function jitter() {
    document.querySelectorAll('.t-display').forEach(function (el) {
      if (el.dataset.jit) return;
      el.dataset.jit = '1';

      var out = '';
      var i = 0;
      // walk the markup, wrapping only text characters and leaving tags alone
      el.innerHTML.replace(/(<[^>]+>)|([^<]+)/g, function (m, tag, text) {
        if (tag) { out += tag; return m; }

        // Split into words first. Each character becomes its own inline-block,
        // which would otherwise let the browser break *inside* a word — so the
        // characters of a word are kept together in a nowrap wrapper.
        text.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { out += tok; return; }

          out += '<span class="jw">';
          for (var c = 0; c < tok.length; c++) {
            var ch = tok[c];
            var rot = (((i * 37) % 11) - 5) * 0.5;   // -2.5deg .. +2.5deg
            var dy  = (((i * 53) % 7) - 3) * 0.5;    // -1.5px  .. +1.5px
            out += '<span class="jit" style="--rot:' + rot.toFixed(2) + 'deg;--dy:' +
                   dy.toFixed(2) + 'px">' + (ch === '&' ? '&amp;' : ch) + '</span>';
            i++;
          }
          out += '</span>';
        });
        return m;
      });
      el.innerHTML = out;
    });
  }

  /* --------------------------------------------------------------- reveals */
  function reveals() {
    var els = document.querySelectorAll('.rev');
    if (!els.length) return;

    if (!('IntersectionObserver' in window) || reduce.matches) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------- ★ er tagliere fills up
     The board is drawn; the food is real. Discs drop in one at a time with a
     squash on landing, each with a small comic puff. */
  var POF = ['POF!', 'CIAF!', 'PAM!', 'TOC!', 'CIAF!', 'POF!', 'PAM!', 'CIAF!'];

  function tagliere() {
    var stage = document.getElementById('tagStage');
    if (!stage) return;

    var discs = stage.querySelectorAll('.tag__disc');
    if (!discs.length) return;

    if (!('IntersectionObserver' in window) || reduce.matches) {
      discs.forEach(function (d) { d.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);

        discs.forEach(function (d, n) {
          setTimeout(function () {
            d.classList.add('is-in');
            puff(stage, d, POF[n % POF.length]);
          }, 140 * n);
        });
      });
    }, { threshold: 0.3 });

    io.observe(stage);
  }

  /* A small comic puff, positioned in percentages so it tracks the
     responsive stage rather than fixed pixels. */
  function puff(stage, disc, word) {
    var p = document.createElement('span');
    p.className = 'tag__pof';
    p.textContent = word;
    p.setAttribute('aria-hidden', 'true');

    var r = disc.getBoundingClientRect();
    var s = stage.getBoundingClientRect();
    if (!s.width || !s.height) return;

    p.style.left = (((r.left - s.left) + r.width * 0.72) / s.width * 100) + '%';
    p.style.top  = (((r.top - s.top) - 6) / s.height * 100) + '%';

    stage.appendChild(p);
    requestAnimationFrame(function () { p.classList.add('is-in'); });
    setTimeout(function () { p.remove(); }, 700);
  }

  /* ------------------------------------------------------- today's opening
     Highlights the current day so nobody has to count rows. Uses the
     visitor's own clock. */
  function today() {
    var rows = document.querySelectorAll('.hours__row');
    if (!rows.length) return;
    var d = new Date().getDay(); // 0 = Sunday
    rows.forEach(function (row) {
      if (Number(row.dataset.day) === d) row.classList.add('is-today');
    });
  }

  function year() {
    var y = document.getElementById('yr');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    if (!reduce.matches) document.documentElement.classList.add('js-anim');
    jitter();
    reveals();
    tagliere();
    today();
    year();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Re-apply the hand-set lettering after a language switch, since i18n
     rewrites the innerHTML of the display headings. */
  document.addEventListener('pp:lang', function () {
    document.querySelectorAll('.t-display').forEach(function (el) {
      delete el.dataset.jit;
    });
    jitter();
  });
})();
