// players.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared player registry + game history for the Darts PWA.
// Loaded by cricket.html, x01.html, and eventually all game files.
//
// localStorage keys used:
//   darts_players      → object of { pid: playerObject }
//   darts_games        → array of completed game records
//   darts_device_owner → string pid of the phone owner
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const PLAYERS_KEY      = 'darts_players';   // all saved player profiles
const GAMES_KEY        = 'darts_games';     // all completed game records
const DEVICE_OWNER_KEY = 'darts_device_owner'; // pid of phone owner

// Special pid used for guest players — never stored in registry
const GUEST_PID = 'pid_guest';

// ── LOW-LEVEL STORAGE HELPERS ─────────────────────────────────────────────────

// getPlayers()
// Returns the full player registry as an object: { pid_1: {...}, pid_2: {...} }
// Returns an empty object if nothing is saved yet.
function getPlayers() {
  try {
    return JSON.parse(localStorage.getItem(PLAYERS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

// savePlayers(players)
// Writes the full player registry object back to localStorage.
function savePlayers(players) {
  try {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  } catch (e) {}
}

// getGames()
// Returns the full game history array.
// Returns an empty array if nothing is saved yet.
function getGames() {
  try {
    return JSON.parse(localStorage.getItem(GAMES_KEY)) || [];
  } catch (e) {
    return [];
  }
}

// saveGames(games)
// Writes the full game history array back to localStorage.
function saveGames(games) {
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
  } catch (e) {}
}

// getDeviceOwnerPid()
// Returns the pid string of whoever owns this phone, or null if not set yet.
function getDeviceOwnerPid() {
  try {
    return localStorage.getItem(DEVICE_OWNER_KEY) || null;
  } catch (e) {
    return null;
  }
}

// setDeviceOwnerPid(pid)
// Saves the phone owner pid. Called from first-launch screen and profile page.
function setDeviceOwnerPid(pid) {
  try {
    localStorage.setItem(DEVICE_OWNER_KEY, pid);
  } catch (e) {}
}

// ── PID GENERATION ────────────────────────────────────────────────────────────

// generatePid()
// Creates a unique sequential player ID like "pid_1", "pid_2", etc.
// Looks at all existing pids and picks the next number.
function generatePid() {
  const players = getPlayers();
  const nums = Object.keys(players)
    .map(k => parseInt(k.replace('pid_', ''), 10))  // extract the number from "pid_3" → 3
    .filter(n => !isNaN(n));                         // ignore any non-numeric keys
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `pid_${next}`;
}

// ── PLAYER CRUD ───────────────────────────────────────────────────────────────

// createPlayer(name)
// Creates a new player profile, saves it, and returns the new player object.
// name → display name string, e.g. "Jim". Must already be checked for
//        uniqueness with isNameTaken() before calling this.
function createPlayer(name) {
  const players = getPlayers();
  const pid     = generatePid();
  const now     = new Date().toISOString();

  const player = {
    pid,
    name:       name.trim(),
    createdAt:  now,
    lastPlayed: now,
    playCount:  0,
  };

  players[pid] = player;
  savePlayers(players);
  return player;
}

// updatePlayer(pid, fields)
// Updates specific fields on an existing player. Pass only what changed.
// Example: updatePlayer('pid_1', { name: 'James' })
function updatePlayer(pid, fields) {
  const players = getPlayers();
  if (!players[pid]) return;
  Object.assign(players[pid], fields);
  savePlayers(players);
}

// touchPlayer(pid)
// Called at the start of every game. Updates lastPlayed and increments playCount.
// This drives the "relevance" sort order in the dropdown.
function touchPlayer(pid) {
  if (pid === GUEST_PID) return; // guests are never saved
  const players = getPlayers();
  if (!players[pid]) return;
  players[pid].lastPlayed = new Date().toISOString();
  players[pid].playCount  = (players[pid].playCount || 0) + 1;
  savePlayers(players);
}

// ── DISPLAY NAME HELPERS ──────────────────────────────────────────────────────

// isNameTaken(name, excludePid)
// Returns true if some OTHER player already has this name.
// Comparison is case-insensitive ("Jim" and "JIM" count as the same name),
// but the name itself is always stored and shown exactly as typed.
// excludePid → pid to skip during the check. Pass the player's own pid when
//              editing, so saving without changing the name doesn't trip
//              over their own existing record.
function isNameTaken(name, excludePid = null) {
  const players = getPlayers();
  const lc = name.trim().toLowerCase();
  return Object.values(players).some(
    p => p.pid !== excludePid && p.name.toLowerCase() === lc
  );
}

// displayName(player, players)
// Returns the string to show in the dropdown for this player.
// Names are now guaranteed unique (enforced at save time), so this is just
// the player's name — kept as its own function so every call site that
// already calls displayName(p, players) keeps working unchanged.
function displayName(player, players) {
  return player.name;
}

// ── DROPDOWN SORT ─────────────────────────────────────────────────────────────

// sortedPlayers(excludePids)
// Returns an array of player objects sorted for the dropdown:
//   1. Device owner first
//   2. Then by most recently played (lastPlayed descending)
//   3. Then alphabetically by name
//
// excludePids → array of pids already selected in other slots (so they don't appear again)
function sortedPlayers(excludePids = []) {
  const players   = getPlayers();
  const ownerPid  = getDeviceOwnerPid();
  const exclude   = new Set(excludePids);

  return Object.values(players)
    .filter(p => !exclude.has(p.pid))  // remove already-selected players
    .sort((a, b) => {
      // Rule 1: device owner always first
      if (a.pid === ownerPid) return -1;
      if (b.pid === ownerPid) return  1;
      // Rule 2: more recently played comes first
      const da = new Date(a.lastPlayed || 0);
      const db = new Date(b.lastPlayed || 0);
      if (db - da !== 0) return db - da;
      // Rule 3: alphabetical tiebreaker
      return a.name.localeCompare(b.name);
    });
}

// ── DROPDOWN BUILDER ──────────────────────────────────────────────────────────

// buildPlayerSlot(container, slotIndex, totalSlots, allSlotStates, onChange)
// Builds one complete player-selection slot inside `container`.
//
// container    → the DOM element to render into (a div)
// slotIndex    → which player slot this is (0-based)
// allSlotStates → array of currently selected pids for ALL slots (for exclusion)
// onChange     → callback fired when this slot's selection changes,
//                so sibling slots can re-render their exclusion lists
//
// Each slot renders:
//   - A search input (type to filter)
//   - A dropdown list of matching players
//   - "Add new player" option at the bottom
//   - An inline form that expands when "Add new" is chosen
//
// Returns an object { getPid, getName } so the game can read the selection.

function buildPlayerSlot(container, slotIndex, allSlotStates, onChange) {
  // We store the current selection for this slot here.
  // selectedPid === null means nothing chosen yet.
  // selectedPid === GUEST_PID means Guest is selected.
  let selectedPid  = null;
  let selectedName = '';

  // ── Build the HTML structure for this slot ──
  container.innerHTML = `
    <div class="ps-slot" data-slot="${slotIndex}">
      <div class="ps-selected" id="ps-sel-${slotIndex}">
        <!-- Shows chosen name, or placeholder if none -->
        <span class="ps-chosen" id="ps-chosen-${slotIndex}">— SELECT PLAYER —</span>
        <span class="ps-caret">▾</span>
      </div>
      <div class="ps-dropdown" id="ps-drop-${slotIndex}" style="display:none">
        <input
          class="ps-search"
          id="ps-search-${slotIndex}"
          type="text"
          placeholder="TYPE TO SEARCH..."
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        >
        <div class="ps-list" id="ps-list-${slotIndex}"></div>
        <!-- Inline new-player form — hidden until "Add new" is tapped -->
        <div class="ps-new-form" id="ps-new-form-${slotIndex}" style="display:none">
          <input class="led-input ps-new-name" id="ps-new-name-${slotIndex}"
                 type="text" placeholder="NAME" maxlength="20"
                 autocorrect="off" spellcheck="false">
          <button class="btn-start ps-new-save" id="ps-new-save-${slotIndex}"
                  style="font-size:0.8rem;padding:0.5rem 1rem;margin-top:0.4rem">
            SAVE &amp; SELECT
          </button>
          <button class="ps-new-cancel" id="ps-new-cancel-${slotIndex}">CANCEL</button>
        </div>
      </div>
    </div>
  `;

  // ── Grab element references ──
  const selDiv   = container.querySelector(`#ps-sel-${slotIndex}`);
  const chosen   = container.querySelector(`#ps-chosen-${slotIndex}`);
  const dropdown = container.querySelector(`#ps-drop-${slotIndex}`);
  const search   = container.querySelector(`#ps-search-${slotIndex}`);
  const list     = container.querySelector(`#ps-list-${slotIndex}`);
  const newForm  = container.querySelector(`#ps-new-form-${slotIndex}`);
  const newName  = container.querySelector(`#ps-new-name-${slotIndex}`);
  const newSave  = container.querySelector(`#ps-new-save-${slotIndex}`);
  const newCancel= container.querySelector(`#ps-new-cancel-${slotIndex}`);

  // ── Open / close the dropdown ──
  selDiv.addEventListener('click', () => {
    const isOpen = dropdown.style.display !== 'none';
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  function openDropdown() {
    dropdown.style.display = 'block';
    search.value = '';
    renderList('');
    search.focus();
  }

  function closeDropdown() {
    dropdown.style.display = 'none';
    newForm.style.display  = 'none';
    search.value = '';
  }

  // ── Filter list as user types ──
  search.addEventListener('input', () => {
    renderList(search.value.trim().toLowerCase());
  });

  // ── Render the player list (filtered by query) ──
  // query → lowercase string from the search input, or '' for no filter
  function renderList(query) {
    const players = getPlayers();
    // Get already-selected pids from sibling slots (not this slot)
    const otherPids = allSlotStates()
      .filter((_, i) => i !== slotIndex)
      .map(s => s.pid)
      .filter(Boolean);

    const sorted = sortedPlayers(otherPids);

    // Filter by query — match against the player's name
    const filtered = query
      ? sorted.filter(p =>
          displayName(p, players).toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query)
        )
      : sorted;

    list.innerHTML = '';

    // ── Render each matching player as a row ──
    filtered.forEach(p => {
      const row = document.createElement('div');
      row.className  = 'ps-row';
      row.textContent = displayName(p, players);
      row.addEventListener('click', () => {
        selectPlayer(p.pid, displayName(p, players));
      });
      list.appendChild(row);
    });

    // ── Guest option ──
    // Always shown unless Guest is already selected in another slot
    const guestTaken = allSlotStates()
      .filter((_, i) => i !== slotIndex)
      .some(s => s.pid === GUEST_PID);

    if (!guestTaken && (!query || 'guest'.includes(query))) {
      const guestRow = document.createElement('div');
      guestRow.className  = 'ps-row ps-guest';
      guestRow.textContent = 'GUEST';
      guestRow.addEventListener('click', () => {
        selectPlayer(GUEST_PID, 'GUEST');
      });
      list.appendChild(guestRow);
    }

    // ── "Add new player" row — always at bottom ──
    const addRow = document.createElement('div');
    addRow.className  = 'ps-row ps-add-new';
    addRow.textContent = '+ ADD NEW PLAYER';
    addRow.addEventListener('click', () => {
      newForm.style.display = 'block';
      newName.value = '';
      newName.focus();
    });
    list.appendChild(addRow);
  }

  // ── Select a player by pid ──
  function selectPlayer(pid, label) {
    selectedPid  = pid;
    selectedName = label;
    chosen.textContent = label;
    chosen.classList.add('ps-chosen-filled');
    closeDropdown();
    onChange(); // tell parent to re-render sibling slots
  }

  // ── Save new player form ──
  newSave.addEventListener('click', () => {
    const name = newName.value.trim();
    if (!name) { toast('ENTER A NAME'); return; }
    if (isNameTaken(name)) { toast('NAME ALREADY TAKEN'); return; }

    // Create the player in localStorage
    const player = createPlayer(name);
    const players = getPlayers();

    // Select them immediately in this slot
    selectPlayer(player.pid, displayName(player, players));
  });

  // ── Cancel new player form ──
  newCancel.addEventListener('click', () => {
    newForm.style.display = 'none';
  });

  // ── Public API returned to the game ──
  // The game calls slot.getPid() and slot.getName() to read the selection.
  return {
    getPid:  () => selectedPid,
    getName: () => selectedName,
  };
}

// ── DEVICE OWNER FIRST-LAUNCH CHECK ──────────────────────────────────────────

// showOwnerSetupIfNeeded(container, onDone)
// If no device owner is set yet, renders a one-time setup prompt inside `container`.
// Calls onDone() when done (either owner chosen or skipped).
// If owner already set, calls onDone() immediately.
function showOwnerSetupIfNeeded(container, onDone) {
  if (getDeviceOwnerPid()) {
    onDone();
    return;
  }

  const players = getPlayers();
  const list    = Object.values(players);

  if (list.length === 0) {
    // No players exist yet — can't pick an owner, skip for now
    onDone();
    return;
  }

  // Render a simple prompt
  container.innerHTML = `
    <div class="owner-setup">
      <div class="s-label">[ WHOSE PHONE IS THIS? ]</div>
      <div class="owner-hint">This lets the app show your stats first. You can change it later in settings.</div>
      <div id="owner-list"></div>
      <button class="btn-resume" id="owner-skip">SKIP FOR NOW</button>
    </div>
  `;

  const ownerList = container.querySelector('#owner-list');

  list.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
    const btn = document.createElement('button');
    btn.className   = 'chip on';
    btn.textContent = p.name;
    btn.style.margin = '0.3rem';
    btn.addEventListener('click', () => {
      setDeviceOwnerPid(p.pid);
      onDone();
    });
    ownerList.appendChild(btn);
  });

  container.querySelector('#owner-skip').addEventListener('click', onDone);
}

// ── GAME LOGGING ──────────────────────────────────────────────────────────────

// logGame(record)
// Appends one completed game to darts_games history.
// Also updates lastPlayed + playCount for each non-guest player.
//
// record shape:
// {
//   gameType: 'cricket' | 'x01',
//   variant:  'regular' | 'cutthroat' | 'hit-only'   (cricket)
//             '501-single-in-single-out'              (x01 example)
//   players:  [ { pid, name } ],   // in turn order
//   winner:   pid string,
//   results:  {
//     [pid]: { marks, rounds, mpr, points }           (cricket)
//     [pid]: { dartsThrown, pointsScored, ppd, checkout } (x01)
//   }
// }
function logGame(record) {
  const games = getGames();

  // Stamp with a unique ID and timestamp
  record.gameId = `g_${Date.now()}`;
  record.date   = new Date().toISOString();

  games.push(record);
  saveGames(games);

  // Update each real player's stats
  record.players.forEach(p => {
    if (p.pid !== GUEST_PID) {
      touchPlayer(p.pid);
    }
  });
}

// ── CAREER STAT HELPERS ───────────────────────────────────────────────────────

// getCareerMPR(pid, variant)
// Calculates a player's lifetime average MPR across all cricket games.
// variant → 'regular' | 'cutthroat' | 'hit-only' | null (null = all variants)
function getCareerMPR(pid, variant = null) {
  const games = getGames();
  let totalMarks  = 0;
  let totalRounds = 0;

  games.forEach(g => {
    if (g.gameType !== 'cricket') return;           // only cricket
    if (variant && g.variant !== variant) return;   // filter by variant if given
    const r = g.results[pid];
    if (!r) return;                                  // player wasn't in this game
    totalMarks  += r.marks  || 0;
    totalRounds += r.rounds || 0;
  });

  if (totalRounds === 0) return null; // not enough data
  return +(totalMarks / totalRounds).toFixed(2); // round to 2 decimal places
}

// getCareerPPD(pid, variant)
// Calculates a player's lifetime average PPD across all x01 games.
// variant → e.g. '501-single-in-double-out' | null (null = all variants)
function getCareerPPD(pid, variant = null) {
  const games = getGames();
  let totalPoints = 0;
  let totalDarts  = 0;

  games.forEach(g => {
    if (g.gameType !== 'x01') return;
    if (variant && g.variant !== variant) return;
    const r = g.results[pid];
    if (!r) return;
    totalPoints += r.pointsScored || 0;
    totalDarts  += r.dartsThrown  || 0;
  });

  if (totalDarts === 0) return null;
  return +(totalPoints / totalDarts).toFixed(2);
}
