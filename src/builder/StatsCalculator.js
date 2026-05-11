/* ═══════════════════════════════════════════════════════════
   AEROWAR — Stats Calculator
   Computes final vehicle stats from components
   ═══════════════════════════════════════════════════════════ */

import { STAT_KEYS, MAX_STAT } from '../utils/constants.js';
import { clamp } from '../utils/math.js';

/**
 * Calculate combined stats from all selected components.
 * @param {object} components - { fuselage, engine, wings, weapons:[], armor, electronics, special:[] }
 * @returns {{ stats: object, totalCost: number, totalWeight: number }}
 */
export function calculateStats(components) {
  const stats = {};
  STAT_KEYS.forEach(k => stats[k] = 0);

  let totalCost = 0;
  let totalWeight = 0;

  const addComponent = (comp) => {
    if (!comp) return;
    totalCost += comp.cost || 0;
    totalWeight += comp.weight || 0;
    if (comp.stats) {
      for (const [key, val] of Object.entries(comp.stats)) {
        if (stats[key] != null) {
          stats[key] += val;
        }
      }
    }
  };

  // Single components
  addComponent(components.fuselage);
  addComponent(components.engine);
  addComponent(components.wings);
  addComponent(components.armor);
  addComponent(components.electronics);

  // Array components
  (components.weapons || []).forEach(addComponent);
  (components.special || []).forEach(addComponent);

  // Weight penalty: heavier = slower / less maneuverable
  const weightPenalty = Math.floor(totalWeight / 500);
  stats.speed = Math.max(0, stats.speed - weightPenalty);
  stats.maneuverability = Math.max(0, stats.maneuverability - Math.floor(weightPenalty * 0.5));

  // Clamp all stats to 0..MAX_STAT
  STAT_KEYS.forEach(k => {
    stats[k] = clamp(stats[k], 0, MAX_STAT);
  });

  return { stats, totalCost, totalWeight };
}

/**
 * Calculate combat power score (simplified overall strength).
 */
export function combatPower(stats) {
  return Math.round(
    stats.damage * 2 +
    stats.armor * 1.5 +
    stats.speed * 1.2 +
    stats.maneuverability * 1.0 +
    stats.range * 0.8 +
    stats.stealth * 1.3 +
    stats.detection * 0.7
  );
}

/**
 * Calculate AA system stats from AA components.
 * @param {object} components - { chassis, radar, missiles, guns }
 */
export function calculateAAStats(components) {
  const stats = {};
  STAT_KEYS.forEach(k => stats[k] = 0);
  let totalCost = 0;

  const addComponent = (comp) => {
    if (!comp) return;
    totalCost += comp.cost || 0;
    if (comp.stats) {
      for (const [key, val] of Object.entries(comp.stats)) {
        if (stats[key] != null) stats[key] += val;
      }
    }
  };

  addComponent(components.chassis);
  addComponent(components.radar);
  addComponent(components.missiles);
  addComponent(components.guns);

  STAT_KEYS.forEach(k => {
    stats[k] = clamp(stats[k], 0, MAX_STAT);
  });

  return { stats, totalCost };
}
