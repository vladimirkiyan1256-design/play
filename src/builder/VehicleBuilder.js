/* ═══════════════════════════════════════════════════════════
   AEROWAR — Vehicle Builder
   Create, name, and manage vehicle designs
   ═══════════════════════════════════════════════════════════ */

import { uid } from '../utils/math.js';
import { calculateStats, calculateAAStats, combatPower } from './StatsCalculator.js';
import { determineAircraftType } from './components.js';

/**
 * A vehicle design (blueprint).
 */
export class VehicleDesign {
  constructor({ name, components, isAA = false }) {
    this.id = uid('design');
    this.name = name;
    this.components = components; // { fuselage, engine, wings, weapons:[], armor, electronics, special:[] }
    this.isAA = isAA;

    if (isAA) {
      const { stats, totalCost } = calculateAAStats(components);
      this.stats = stats;
      this.cost = totalCost;
      this.type = { type: 'aa', label: 'ПВО', icon: '🎯' };
    } else {
      const { stats, totalCost, totalWeight } = calculateStats(components);
      this.stats = stats;
      this.cost = totalCost;
      this.weight = totalWeight;
      this.type = determineAircraftType(components);
    }

    this.power = combatPower(this.stats);
    this.createdAt = Date.now();
  }
}

/**
 * A built vehicle instance (from a design).
 */
export class Vehicle {
  constructor(design, ownerId) {
    this.id = uid('unit');
    this.designId = design.id;
    this.name = design.name;
    this.stats = { ...design.stats };
    this.type = { ...design.type };
    this.cost = design.cost;
    this.power = design.power;
    this.ownerId = ownerId;

    // Instance state
    this.hp = 100;
    this.maxHp = 100;
    this.fuel = 100;
    this.ammo = 100;
    this.experience = 0;
    this.kills = 0;
    this.sorties = 0;

    // Location
    this.territoryId = null;
    this.mission = null; // current mission

    // Upgrade level
    this.upgradeLevel = 0;
  }

  /** True if destroyed */
  get isDestroyed() {
    return this.hp <= 0;
  }

  /** Take damage */
  takeDamage(amount) {
    const absorbed = Math.min(amount * 0.3, this.stats.armor);
    this.hp -= Math.max(1, amount - absorbed);
    if (this.hp < 0) this.hp = 0;
  }

  /** Repair to full (costs money) */
  repair() {
    this.hp = this.maxHp;
    this.fuel = 100;
    this.ammo = 100;
  }

  /** Apply an upgrade: +5% to all stats, increment level */
  upgrade() {
    this.upgradeLevel++;
    for (const key of Object.keys(this.stats)) {
      this.stats[key] = Math.min(100, Math.round(this.stats[key] * 1.05));
    }
    this.maxHp += 5;
    this.hp = this.maxHp;
    this.power = combatPower(this.stats);
  }

  /** Gain experience from a sortie */
  addExperience(xp) {
    this.experience += xp;
    this.sorties++;
  }
}

/**
 * VehicleBuilder manages designs and production.
 */
export default class VehicleBuilder {
  constructor() {
    /** @type {VehicleDesign[]} */
    this.designs = [];
  }

  /**
   * Create a new design.
   * @param {string} name - User-chosen name
   * @param {object} components - Selected components
   * @param {boolean} isAA - Is this an AA system?
   * @returns {VehicleDesign}
   */
  createDesign(name, components, isAA = false) {
    const design = new VehicleDesign({ name, components, isAA });
    this.designs.push(design);
    return design;
  }

  /**
   * Build a vehicle from an existing design.
   * @param {string} designId
   * @param {string} ownerId - Player id
   * @returns {Vehicle|null}
   */
  build(designId, ownerId) {
    const design = this.designs.find(d => d.id === designId);
    if (!design) return null;
    return new Vehicle(design, ownerId);
  }

  /**
   * Get all designs for a display list.
   */
  getDesigns(isAA = false) {
    return this.designs.filter(d => d.isAA === isAA);
  }

  /**
   * Delete a design.
   */
  deleteDesign(designId) {
    this.designs = this.designs.filter(d => d.id !== designId);
  }
}
