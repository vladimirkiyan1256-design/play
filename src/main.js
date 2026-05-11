/* ═══════════════════════════════════════════════════════════
   AEROWAR v2 — Entry Point
   ═══════════════════════════════════════════════════════════ */

import GameEngine from './engine/GameEngine.js';

const engine = new GameEngine();
engine.init().catch(err => {
  console.error('Failed to init AeroWar:', err);
});

// Global access for debugging
window.__aerowar = engine;
