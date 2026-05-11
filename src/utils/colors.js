/* ═══════════════════════════════════════════════════════════
   AEROWAR — Color Utilities
   ═══════════════════════════════════════════════════════════ */

import { FACTION_COLORS } from './constants.js';

/** Get color for a player by colorIndex */
export function getPlayerColor(colorIndex) {
  return FACTION_COLORS[colorIndex % FACTION_COLORS.length];
}

/** Convert hex color to rgba string */
export function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Lighten a hex color */
export function lighten(hex, amount = 0.3) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, r + Math.round((255 - r) * amount));
  g = Math.min(255, g + Math.round((255 - g) * amount));
  b = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Darken a hex color */
export function darken(hex, amount = 0.3) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.round(r * (1 - amount));
  g = Math.round(g * (1 - amount));
  b = Math.round(b * (1 - amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
