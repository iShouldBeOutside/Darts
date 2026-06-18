'use strict';

/* ═══════════════════════════════════════
   THEME
   Reads/writes localStorage key 'darts-theme'.
   Call initTheme() on every page load.
   The toggle button is only on the hub; all
   other pages just call initTheme() to apply.
═══════════════════════════════════════ */
function initTheme() {
  let bright = false;
  try { bright = localStorage.getItem('darts-theme') === 'bright'; } catch(e) {}
  document.body.classList.toggle('theme-bright', bright);
  return bright;
}

function toggleTheme() {
  const bright = !document.body.classList.contains('theme-bright');
  document.body.classList.toggle('theme-bright', bright);
  try { localStorage.setItem('darts-theme', bright ? 'bright' : 'dark'); } catch(e) {}
  return bright;
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ═══════════════════════════════════════
   BUST FLASH
═══════════════════════════════════════ */
function bustFlash() {
  const f = document.getElementById('bust-flash');
  f.classList.add('show');
  setTimeout(() => f.classList.remove('show'), 300);
}

/* ═══════════════════════════════════════
   NAME INPUTS
   containerId — id of the wrapper div
   n           — number of inputs to build
   prefix      — placeholder prefix e.g. "PLAYER"
═══════════════════════════════════════ */
function buildNameInputs(containerId, n, prefix) {
  const w = document.getElementById(containerId);
  const old = [...w.querySelectorAll('input')].map(i => i.value);
  w.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const inp = document.createElement('input');
    inp.className = 'led-input';
    inp.type = 'text';
    inp.placeholder = `${prefix} ${i + 1}`;
    inp.value = old[i] || '';
    if (i > 0) inp.style.marginTop = '0.4rem';
    w.appendChild(inp);
  }
}

function getNames(containerId, fallbackPrefix) {
  return [...document.getElementById(containerId).querySelectorAll('input')]
    .map((x, i) => x.value.trim().toUpperCase() || `${fallbackPrefix}${i + 1}`);
}

/* ═══════════════════════════════════════
   WIN OVERLAY
   Shows the shared #win-overlay.
   onNewGame — callback for the NEW GAME btn.
═══════════════════════════════════════ */
function showWin(name, sub, onNewGame) {
  SFX.win();
  document.getElementById('win-name').textContent = name;
  document.getElementById('win-sub').innerHTML = sub;
  document.getElementById('win-overlay').classList.add('show');
  document.getElementById('win-new-btn').onclick = onNewGame;
}
