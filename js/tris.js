/* ==========================================================================
   tris.js — the tic-tac-toe grid printed on their paper placemats, playable
   on the phone already in your hand at the table.
   You are X and move first; the pig plays O and does not lose (it takes the
   win, blocks yours, then prefers centre, corners, sides). A beatable
   opponent would be more fun for thirty seconds and less fun forever.
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

  var cells = [];
  var grid = new Array(9).fill('');
  var over = false;
  var lastKey = 'tris.turn';   // so a finished game re-renders on language switch

  function t(key) {
    return (window.PP_I18N && window.PP_I18N.t) ? window.PP_I18N.t(key) : key;
  }

  function build() {
    board.innerHTML = '';
    cells = [];
    for (var i = 0; i < 9; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tris__cell';
      b.dataset.i = String(i);
      b.setAttribute('aria-label', 'Casella ' + (i + 1));
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

  function paint() {
    for (var i = 0; i < 9; i++) {
      cells[i].textContent = grid[i] ? grid[i].toUpperCase() : '';
      cells[i].dataset.p = grid[i] || '';
      cells[i].disabled = over || !!grid[i];
    }
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
    paint();
    if (again) again.hidden = false;
  }

  /* the pig's move, in priority order */
  function pigMove() {
    var open = free(grid);
    var i, g;

    // 1. take a win
    for (i = 0; i < open.length; i++) {
      g = grid.slice(); g[open[i]] = 'o';
      if (winner(g)) return open[i];
    }
    // 2. block yours
    for (i = 0; i < open.length; i++) {
      g = grid.slice(); g[open[i]] = 'x';
      if (winner(g)) return open[i];
    }
    // 3. centre, then corners, then sides
    var pref = [4, 0, 2, 6, 8, 1, 3, 5, 7];
    for (i = 0; i < pref.length; i++) {
      if (!grid[pref[i]]) return pref[i];
    }
    return -1;
  }

  function onPlay(e) {
    if (over) return;
    var i = Number(e.currentTarget.dataset.i);
    if (grid[i]) return;

    grid[i] = 'x';
    paint();

    var res = winner(grid);
    if (res) return finish(res);
    if (!free(grid).length) return finish(null);

    // a beat before the pig answers, so the move reads as a response
    setTimeout(function () {
      var m = pigMove();
      if (m < 0) return finish(null);
      grid[m] = 'o';
      paint();

      var r2 = winner(grid);
      if (r2) return finish(r2);
      if (!free(grid).length) return finish(null);
      lastKey = 'tris.turn';
      status.textContent = t(lastKey);
    }, 260);
  }

  function reset() {
    grid = new Array(9).fill('');
    over = false;
    lastKey = 'tris.turn';
    cells.forEach(function (c) { c.classList.remove('is-win'); });
    status.textContent = t(lastKey);
    if (again) again.hidden = true;
    paint();
  }

  build();
  reset();

  if (again) again.addEventListener('click', reset);

  /* keep the status line in the current language, finished game included */
  document.addEventListener('pp:lang', function () {
    status.textContent = t(lastKey);
  });
})();
