/* ==========================================================================
   tris.js — the tic-tac-toe grid printed on their paper placemats, playable
   on the phone already in your hand at the table.

   Marks are drawn as SVG strokes that draw themselves in, so a move looks
   hand-written on the placemat rather than typed. You are X and move first;
   the pig plays O and does not lose (takes the win, blocks yours, then
   prefers centre, corners, sides).
   ========================================================================== */
(function () {
  'use strict';

  var board = document.getElementById('trisBoard');
  var status = document.getElementById('trisStatus');
  var again = document.getElementById('trisAgain');
  if (!board || !status) return;

  var LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  /* hand-drawn marks — deliberately not perfectly straight/round */
  var MARK = {
    x: '<svg class="mk" viewBox="0 0 100 100" aria-hidden="true">' +
         '<path class="mk__p" d="M24 22 C42 40 58 58 77 78"/>' +
         '<path class="mk__p mk__p--2" d="M78 23 C60 41 42 59 23 77"/>' +
       '</svg>',
    o: '<svg class="mk" viewBox="0 0 100 100" aria-hidden="true">' +
         '<path class="mk__p" d="M50 18 C74 18 84 38 83 52 C82 70 68 83 49 83 C31 83 17 69 17 51 C17 33 30 18 50 18"/>' +
       '</svg>'
  };

  var cells = [];
  var grid = new Array(9).fill('');
  var over = false;
  var lastKey = 'tris.turn';

  /* PP_I18N.t() answers with the key itself when the key is missing, which as a
     visible label would read "tris.cell". `fb` is the Italian to fall back to
     until js/i18n.js carries the key. */
  function t(key, fb) {
    var v = (window.PP_I18N && window.PP_I18N.t) ? window.PP_I18N.t(key) : key;
    return (v === key && fb != null) ? fb : v;
  }

  /* The cell labels were hardcoded Italian and never re-read on a language
     switch, so a screen-reader user reading the page in English heard "Casella
     uno" for the whole game. Built here, re-applied on pp:lang. */
  function cellLabel(i) {
    var base = t('tris.cell', 'Casella') + ' ' + (i + 1);
    return grid[i] ? base + ': ' + grid[i].toUpperCase() : base;
  }

  function relabel() {
    for (var i = 0; i < 9; i++) cells[i].setAttribute('aria-label', cellLabel(i));
  }

  function build() {
    board.innerHTML = '';
    cells = [];
    for (var i = 0; i < 9; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tris__cell';
      b.dataset.i = String(i);
      b.setAttribute('aria-label', cellLabel(i));
      b.addEventListener('click', onPlay);
      board.appendChild(b);
      cells.push(b);
    }
  }

  function winner(g) {
    for (var i = 0; i < LINES.length; i++) {
      var L = LINES[i];
      if (g[L[0]] && g[L[0]] === g[L[1]] && g[L[1]] === g[L[2]]) {
        return { who: g[L[0]], line: L };
      }
    }
    return null;
  }

  function free(g) {
    var out = [];
    for (var i = 0; i < 9; i++) if (!g[i]) out.push(i);
    return out;
  }

  /* Only ever adds a mark, never re-renders the whole board: re-rendering
     would restart every draw-in animation on each move. */
  function place(i, who) {
    grid[i] = who;
    cells[i].innerHTML = MARK[who];
    cells[i].dataset.p = who;
    cells[i].disabled = true;
    cells[i].setAttribute('aria-label', cellLabel(i));
  }

  function lockAll() {
    for (var i = 0; i < 9; i++) cells[i].disabled = true;
  }

  function finish(res) {
    over = true;
    if (res) {
      res.line.forEach(function (i) { cells[i].classList.add('is-win'); });
      lastKey = res.who === 'x' ? 'tris.win' : 'tris.lose';
    } else {
      lastKey = 'tris.draw';
    }
    status.textContent = t(lastKey);
    lockAll();
    if (again) again.hidden = false;
  }

  /* the pig's move, in priority order */
  function pigMove() {
    var open = free(grid);
    var i, g;

    for (i = 0; i < open.length; i++) {          // 1. take a win
      g = grid.slice(); g[open[i]] = 'o';
      if (winner(g)) return open[i];
    }
    for (i = 0; i < open.length; i++) {          // 2. block yours
      g = grid.slice(); g[open[i]] = 'x';
      if (winner(g)) return open[i];
    }
    var pref = [4, 0, 2, 6, 8, 1, 3, 5, 7];      // 3. centre, corners, sides
    for (i = 0; i < pref.length; i++) {
      if (!grid[pref[i]]) return pref[i];
    }
    return -1;
  }

  function onPlay(e) {
    if (over) return;
    var i = Number(e.currentTarget.dataset.i);
    if (grid[i]) return;

    // Disabling the element that has focus hands focus back to <body>, and
    // re-enabling it later does not give it back. A keyboard player was thrown
    // to the top of menu.html after every single move and had to Tab down
    // through the header, the category rail and ten sections to play again.
    // Remember whether we were the ones holding focus, and where.
    var hadFocus = (document.activeElement === cells[i]);

    place(i, 'x');

    var res = winner(grid);
    if (res) return finish(res);
    if (!free(grid).length) return finish(null);

    lockAll();  // no double moves while the pig is thinking

    setTimeout(function () {
      var m = pigMove();
      if (m < 0) return finish(null);
      place(m, 'o');

      var r2 = winner(grid);
      if (r2) return finish(r2);
      if (!free(grid).length) return finish(null);

      // hand the free cells back
      for (var k = 0; k < 9; k++) if (!grid[k]) cells[k].disabled = false;

      // ...and hand focus back with them: the played cell is gone as a target,
      // so land on the next free one, scanning forward and then wrapping.
      if (hadFocus) {
        for (var s = 1; s <= 9; s++) {
          var n = (i + s) % 9;
          if (!cells[n].disabled) { cells[n].focus(); break; }
        }
      }

      lastKey = 'tris.turn';
      status.textContent = t(lastKey);
    }, 320);
  }

  function reset() {
    grid = new Array(9).fill('');
    over = false;
    lastKey = 'tris.turn';
    for (var i = 0; i < 9; i++) {
      cells[i].classList.remove('is-win');
      cells[i].innerHTML = '';
      cells[i].dataset.p = '';
      cells[i].disabled = false;
      cells[i].setAttribute('aria-label', cellLabel(i));
    }
    status.textContent = t(lastKey);
    if (again) again.hidden = true;
  }

  build();
  reset();

  if (again) again.addEventListener('click', function () {
    reset();
    board.querySelector('.tris__cell').focus();
  });

  /* keep the status line AND the cell labels in the current language, finished
     game included — the labels used to stay Italian forever after a switch */
  document.addEventListener('pp:lang', function () {
    status.textContent = t(lastKey);
    relabel();
  });
})();
