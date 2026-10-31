'use strict';
/* dartlogic.js — pure darts math + per-player throw-frequency presets.
   No DOM in here, so it can be unit-tested in Node as well as loaded
   in the browser. In the browser it attaches to window.DartLogic;
   in Node it also exports via module.exports.
   ─────────────────────────────────────────────────────────────────────
   Dart model: one dart can be
     single 1–20, double 2–40 (even), triple 3–60 (multiple of 3),
     single bull 25, double bull 50. 0 = miss.
   A "possible" value is one reachable by the stated number of darts.
*/
(function (root) {
  // ── All single-dart outcomes, in the order checkout search prefers ──
  // Triples first (highest first), then doubles, then singles. Bull
  // outcomes sit with their multiplier group (DB with doubles, SB with
  // singles). Label convention matches the app's checkout display:
  // singles are plain ("20"), doubles "D20", triples "T20", bulls SB/DB.
  const OUTCOMES = [];
  for (let n = 20; n >= 1; n--) OUTCOMES.push({ points: 3 * n, val: n, mult: 3, label: 'T' + n });
  OUTCOMES.push({ points: 50, val: 25, mult: 2, label: 'DB' });
  for (let n = 20; n >= 1; n--) OUTCOMES.push({ points: 2 * n, val: n, mult: 2, label: 'D' + n });
  OUTCOMES.push({ points: 25, val: 25, mult: 1, label: 'SB' });
  for (let n = 20; n >= 1; n--) OUTCOMES.push({ points: n, val: n, mult: 1, label: String(n) });

  const SINGLE_VALUES = new Set(OUTCOMES.map(o => o.points));
  SINGLE_VALUES.add(0);

  function isPossibleSingle(v) {
    return Number.isInteger(v) && SINGLE_VALUES.has(v);
  }
  // All totals reachable with 0–3 darts.
  const ROUND_TOTALS = (function () {
    const s = new Set([0]);
    const vals = [...SINGLE_VALUES];
    for (const a of vals) for (const b of vals) for (const c of vals) s.add(a + b + c);
    return s;
  })();
  function isPossibleRound(v) {
    return Number.isInteger(v) && v >= 0 && v <= 180 && ROUND_TOTALS.has(v);
  }
  function decompositions(v) {
    return OUTCOMES.filter(o => o.points === v);
  }
  function canBeDouble(v) { return decompositions(v).some(o => o.mult === 2); }
  function canBeTriple(v) { return decompositions(v).some(o => o.mult === 3); }
  function qualifiesAsOut(outcome, outMode) {
    if (outMode === 'single') return true;
    if (outMode === 'double') return outcome.mult === 2;
    if (outMode === 'master') return outcome.mult === 2 || outcome.mult === 3;
    return true;
  }

  // ── Checkout search ────────────────────────────────────────────────
  // Shortest route first (a 2-dart finish beats a 3-dart one). Among
  // routes of that length, rank by: a preferred finishing double, then
  // T20 first, then single (safer) middle darts. That is what turns
  // 120 into T20 - 20 - D20 instead of the technically-valid-but-ugly
  // T20 - T18 - D3, and 170 into T20 - T20 - DB.
  const PREFERRED_FINISH = [40, 32, 20, 16, 24, 36, 50, 12, 8, 4, 2];
  function finishRank(outcome) {
    const i = PREFERRED_FINISH.indexOf(outcome.points);
    if (i >= 0) return 100 - i;
    return outcome.points; // other finishes: bigger double/triple first
  }
  function routeScore(route) {
    const last = route[route.length - 1];
    const firstTriple = route[0].mult === 3 ? 10 : 0;
    const singleMiddles = route.slice(0, -1).filter(o => o.mult === 1).length;
    return [finishRank(last), firstTriple, singleMiddles, route[0].points];
  }
  function compareScore(a, b) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i];
    return 0;
  }
  function findCheckout(remaining, maxDarts, outMode) {
    if (!Number.isInteger(remaining) || remaining <= 0 || maxDarts < 1) return null;
    for (let len = 1; len <= Math.min(maxDarts, 3); len++) {
      const routes = [];
      const route = [];
      (function search(depth, left) {
        if (depth === len) { if (left === 0) routes.push(route.slice()); return; }
        for (const o of OUTCOMES) {
          if (o.points > left) continue;
          if (depth === len - 1) {
            if (o.points !== left || !qualifiesAsOut(o, outMode)) continue;
          } else if (o.points === left) {
            continue; // would finish early — shorter route already tried
          }
          route.push(o);
          search(depth + 1, left - o.points);
          route.pop();
        }
      })(0, remaining);
      if (routes.length) {
        routes.sort((a, b) => compareScore(routeScore(a), routeScore(b)));
        return routes[0];
      }
    }
    return null;
  }

  // Scores finishable in <=3 darts, per out-mode, built once by
  // enumerating every 1–3 dart sequence (not by re-running the search
  // per score). Used only for "leave" checks, so it stays fast.
  const finishable3Cache = {};
  function finishable3(outMode) {
    if (finishable3Cache[outMode]) return finishable3Cache[outMode];
    const set = new Set();
    const seq = [];
    (function gen(depth, sum) {
      if (depth > 0) {
        const last = seq[seq.length - 1];
        if (qualifiesAsOut(last, outMode)) set.add(sum);
      }
      if (depth === 3) return;
      for (const o of OUTCOMES) {
        if (sum + o.points > 501) continue;
        seq.push(o); gen(depth + 1, sum + o.points); seq.pop();
      }
    })(0, 0);
    finishable3Cache[outMode] = set;
    return set;
  }
  function oneDartFinish(remaining, outMode) {
    return OUTCOMES.some(o => o.points === remaining && qualifiesAsOut(o, outMode));
  }

  // Best "leave" when no finish exists in the darts left. Use all darts
  // left. First choice: leave a preferred one-dart finish (D20/D16/…).
  // Fallback: score as much as possible while still leaving a score
  // that is finishable next visit. Leaving 3 from 180 (by scoring 177)
  // is NOT a good leave, even though it is the highest score — it
  // leaves a tiny, awkward finish — so max-score alone is never the
  // criterion when a preferred leave is available.
  function findLeave(remaining, dartsLeft, outMode) {
    if (remaining <= 0 || dartsLeft < 1) return null;
    const finishable = finishable3(outMode);
    let bestPreferred = null, bestFallback = null;
    const route = [];
    (function search(depth, left, sum) {
      if (depth === dartsLeft) {
        if (sum === 0 || left === remaining) return;
        if (!finishable.has(left)) return;
        const cand = { route: route.slice(), leave: left, sum };
        if (oneDartFinish(left, outMode)) {
          const rank = PREFERRED_FINISH.indexOf(left);
          const key = [rank >= 0 ? 100 - rank : 0, ...routeScore(route)];
          if (!bestPreferred || compareScore(key, bestPreferred.key) < 0) { // compareScore is a sort comparator: <0 means key ranks first
            bestPreferred = { ...cand, key };
          }
        } else if (!bestFallback || sum > bestFallback.sum) {
          bestFallback = cand;
        }
        return;
      }
      for (const o of OUTCOMES) {
        if (o.points > left || o.points === left) continue;
        route.push(o); search(depth + 1, left - o.points, sum + o.points); route.pop();
      }
      route.push({ points: 0, val: null, mult: 0, label: 'MISS' });
      search(depth + 1, left, sum); route.pop();
    })(0, remaining, 0);
    const best = bestPreferred || bestFallback;
    return best ? { route: best.route, leave: best.leave, sum: best.sum, oneDartFinish: !!bestPreferred } : null;
  }

  function checkoutRoute(remaining, dartsLeft, outMode) {
    const route = findCheckout(remaining, Math.min(dartsLeft, 3), outMode);
    if (route) return { type: 'checkout', route, labels: route.map(o => o.label) };
    const leave = findLeave(remaining, Math.min(dartsLeft, 3), outMode);
    if (leave) {
      return {
        type: 'leave', route: leave.route, labels: leave.route.map(o => o.label),
        leave: leave.leave,
        leaveRoute: findCheckout(leave.leave, 3, outMode).map(o => o.label),
      };
    }
    return { type: 'none' };
  }
  function formatCheckout(result) {
    if (!result || result.type === 'none') return 'NO FINISH';
    if (result.type === 'checkout') return 'OUT: ' + result.labels.join(' - ');
    return 'NO OUT · LEAVE ' + result.leave + ' (' + result.labels.join(' - ') + ')';
  }

  // ── Per-player throw-frequency presets ─────────────────────────────
  // Stored per pid (not name, so renaming a player keeps their history).
  // Shape: { pid: { round: { "26": 4, ... }, dart: { "20": 12, ... } } }
  // Guests are never recorded. Old games (before this feature) simply
  // have no history, so the fallbacks below are shown instead.
  const HIST_KEY = 'darts_throw_history';
  const FALLBACK_ROUNDS = [26, 41, 45, 60, 81, 100, 140, 85]; // 8, so the preset row is always full
  const FALLBACK_DARTS = [20, 5, 1, 3, 15, 18, 10, 7];
  let memStore = {};
  function readHist() {
    try {
      if (typeof localStorage !== 'undefined') return JSON.parse(localStorage.getItem(HIST_KEY)) || {};
    } catch (e) {}
    return memStore;
  }
  function writeHist(h) {
    try {
      if (typeof localStorage !== 'undefined') { localStorage.setItem(HIST_KEY, JSON.stringify(h)); return; }
    } catch (e) {}
    memStore = h;
  }
  function recordThrow(pid, kind, value) {
    if (!pid || pid === 'pid_guest' || !Number.isInteger(value)) return;
    const h = readHist();
    if (!h[pid]) h[pid] = { round: {}, dart: {} };
    const bucket = kind === 'round' ? h[pid].round : h[pid].dart;
    bucket[String(value)] = (bucket[String(value)] || 0) + 1;
    writeHist(h);
  }
  function topValues(pid, kind, count, fallback) {
    const h = readHist();
    const bucket = (h[pid] && h[pid][kind]) || {};
    const ranked = Object.entries(bucket)
      .map(([v, c]) => ({ v: +v, c }))
      .sort((a, b) => (b.c - a.c) || (b.v - a.v));
    const out = ranked.slice(0, count).map(r => r.v);
    // Top up with fallbacks (not already shown) so a new player still
    // gets a useful row, and a returning player still gets a full row
    // if they have fewer distinct scores than the row holds.
    for (const f of fallback) {
      if (out.length >= count) break;
      if (!out.includes(f)) out.push(f);
    }
    return out;
  }
  function topRounds(pid, count) { return topValues(pid, 'round', count, FALLBACK_ROUNDS); }
  function topDarts(pid, count) { return topValues(pid, 'dart', count, FALLBACK_DARTS); }

  const api = {
    OUTCOMES, isPossibleSingle, isPossibleRound, decompositions,
    canBeDouble, canBeTriple, qualifiesAsOut,
    findCheckout, findLeave, checkoutRoute, formatCheckout,
    recordThrow, topRounds, topDarts, FALLBACK_ROUNDS, FALLBACK_DARTS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DartLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
