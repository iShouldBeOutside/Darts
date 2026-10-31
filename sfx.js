'use strict';
/* sfx.js — sound effects + the global sound on/off switch.
   The original melodic SFX were stubs (empty functions) and still are:
   there is no sound engine in this app yet, so the bell toggle only
   gates the one real sound the app now produces, the "No Score"
   announcement (see noScore() below). Wiring the other SFX through
   this same gate later is a one-line change per function.
   ─────────────────────────────────────────────────────────────────────
   Sound setting: localStorage 'darts-sound' = 'on' | 'off', default 'on',
   shared by every page (same origin). The bell button (class
   .sound-btn, auto-bound in utils.js) shows 🔔 when on, 🔕 when off.
   ─────────────────────────────────────────────────────────────────────
   "No Score" audio: the app plays assets/0.wav (repo root; games
   pages resolve it as ../assets/0.wav). Do NOT rename it to .mp3 —
   the file is a .wav, and renaming the extension would not change
   its format. If 0.wav is missing, or fails to play, the app falls
   back to speaking "No score" with the device's en-GB voice
   (SpeechSynthesis), which on a Pixel is a clean British voice.
   That speech fallback is the safe default: removing 0.wav later
   never breaks the app, it just goes back to speaking. */
const SFX = (() => {
  const SOUND_KEY = 'darts-sound';

  function isSoundOn() {
    try { return localStorage.getItem(SOUND_KEY) !== 'off'; }
    catch (e) { return true; }
  }
  function setSoundOn(on) {
    try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch (e) {}
    document.querySelectorAll('.sound-btn').forEach(b => {
      b.textContent = on ? '🔔' : '🔕';
      b.setAttribute('aria-label', on ? 'Sound on — tap to mute' : 'Sound off — tap to unmute');
      b.classList.toggle('sound-off', !on);
    });
  }
  function speakNoScore() {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('No score');
      u.lang = 'en-GB';
      u.rate = 0.92;
      const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      const gb = voices.find(v => (v.lang || '').toLowerCase().startsWith('en-gb'));
      if (gb) u.voice = gb;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function noScore() {
    if (!isSoundOn()) return;
    try {
      const inGames = window.location.pathname.includes('/games/');
      const src = (inGames ? '../assets/0.wav' : 'assets/0.wav');
      const audio = new Audio(src);
      let fellBack = false;
      const fallback = () => { if (!fellBack) { fellBack = true; speakNoScore(); } };
      audio.addEventListener('error', fallback, { once: true });
      const p = audio.play();
      if (p && p.catch) p.catch(fallback);
      // If the clip is missing the error event fires quickly; if the
      // browser never fires it (some do not for 404 audio), the play
      // promise rejection above is the fallback.
    } catch (e) { speakNoScore(); }
  }

  return {
    isSoundOn, setSoundOn, noScore,
    hit() { }, double() { }, triple() { }, close() { }, score() { },
    miss() { }, dead() { }, next() { }, bust() { }, checkout() { }, win() { },
  };
})();
