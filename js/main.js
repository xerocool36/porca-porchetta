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

  /* -------------------------------------------------------------- parallax
     The cave drifts slightly slower than the page, so the hero has depth.
     rAF-throttled, and skipped entirely under reduced motion. */
  function parallax() {
    var arch = document.getElementById('heroArch');
    if (!arch || reduce.matches) return;

    var pending = false;

    /* Sets a custom property rather than `transform`: the arch element already
       carries a centring transform that differs between mobile and desktop, and
       writing transform here would silently clobber it. CSS composes --py into
       the image inside the mask instead. */
    function frame() {
      pending = false;
      var y = window.scrollY;
      if (y > window.innerHeight * 1.3) return;      // stop once it's offscreen
      arch.style.setProperty('--py', (y * 0.14).toFixed(1) + 'px');
    }

    window.addEventListener('scroll', function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(frame);
    }, { passive: true });
  }

  /* ------------------------------------------------------------- scroll spy
     Marks the category chip for the section you are actually reading, and
     scrolls the rail so that chip stays visible. */
  function spy() {
    var rail = document.getElementById('cats');
    if (!rail) return;

    var links = [].slice.call(rail.querySelectorAll('.cats__link'));
    var sections = links.map(function (a) {
      return document.querySelector(a.getAttribute('href'));
    });
    if (!sections.length || !sections[0]) return;

    function setOn(i) {
      links.forEach(function (a, n) { a.classList.toggle('is-on', n === i); });
      var chip = links[i];
      if (chip) {
        var inner = rail.querySelector('.cats__inner');
        var want = chip.offsetLeft - 16;
        if (Math.abs(inner.scrollLeft - want) > 24) {
          inner.scrollTo({ left: want, behavior: reduce.matches ? 'auto' : 'smooth' });
        }
      }
    }

    if (!('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = sections.indexOf(e.target);
        if (i > -1) setOn(i);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { if (s) io.observe(s); });
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
    parallax();
    spy();
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
