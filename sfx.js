'use strict';

const SFX = (() => {
  return {
    // Single dart hit
    hit() { },
    // Double — two rising blips
    double() { },
    // Triple — three rising blips
    triple() { },
    // Closing a cricket number — small chord
    close() { },
    // Scoring overflow points — upward sawtooth sweep
    score() { },
    // Miss
    miss() { },
    // Dead number (fully closed, no effect)
    dead() { },
    // End of turn / next player
    next() { },
    // X01 bust
    bust() { },
    // X01 checkout (hits zero)
    checkout() { },
    // Win fanfare
    win() { },
  };
})();