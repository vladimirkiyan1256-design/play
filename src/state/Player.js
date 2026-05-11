/* ═══════════════════════════════════════════════════════════
   AEROWAR v2 — Player Model
   ═══════════════════════════════════════════════════════════ */

import { uid } from '../utils/math.js';
import { ECONOMY } from '../utils/constants.js';

export default class Player {
  /**
   * @param {object} opts
   * @param {string} opts.name
   * @param {number} opts.colorIndex
   * @param {boolean} [opts.isHuman=false]
   * @param {string} [opts.aiType='medium']
   */
  constructor({ name, colorIndex, isHuman = false, aiType = 'medium' }) {
    this.id = uid('player');
    this.name = name;
    this.colorIndex = colorIndex;
    this.isHuman = isHuman;
    this.aiType = aiType;

    // Economy
    this.money = ECONOMY.START_MONEY;
    this.income = 0;
    this.expenses = 0;

    // Units on the map
    /** @type {Array<{id, type, name, icon, lat, lng, hp, maxHp, power, speed, status, selected, targetLat, targetLng, ownerId, colorIndex}>} */
    this.units = [];

    // Buildings on the map
    /** @type {Array<{id, type, name, icon, lat, lng, hp, maxHp, radiusKm, ownerId, colorIndex}>} */
    this.buildings = [];

    // Vehicle designs (blueprints)
    this.designs = [];

    // Stock portfolio
    this.portfolio = {};
    this.predictionBets = [];

    // Alive flag
    this.alive = true;
  }

  earn(amount) { this.money += amount; }
  spend(amount) {
    if (this.money < amount) return false;
    this.money -= amount;
    return true;
  }
  canAfford(amount) { return this.money >= amount; }
}
