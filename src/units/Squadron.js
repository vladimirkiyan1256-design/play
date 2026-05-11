/* ═══════════════════════════════════════════════════════════
   AEROWAR v2.1 — Squadron System (group units for missions)
   ═══════════════════════════════════════════════════════════ */

import { uid } from '../utils/math.js';

export default class SquadronManager {
  constructor() {
    /** @type {Map<string, Squadron>} */
    this.squadrons = new Map();
  }

  /**
   * Create a squadron from selected units.
   * @param {string} name
   * @param {Array} units - array of unit objects (must be same domain: air, land, sea)
   */
  create(name, units) {
    if (units.length < 2) return null;
    const domain = units[0].domain;
    if (!units.every(u => u.domain === domain)) return null; // must be same domain

    const id = uid('sqd');
    const sq = {
      id, name: name || `Эскадрилья-${id.slice(-3)}`,
      units: units.map(u => u.id),
      domain, leaderId: units[0].id,
      formation: 'line', // line, wedge, spread
    };

    for (const u of units) u.squadronId = id;
    this.squadrons.set(id, sq);
    return sq;
  }

  /** Disband a squadron */
  disband(squadronId) {
    const sq = this.squadrons.get(squadronId);
    if (!sq) return;
    // Units keep their current state but lose squadronId
    this.squadrons.delete(squadronId);
    return sq.units; // return unitIds to clear their squadronId
  }

  /** Issue move order to entire squadron */
  moveSquadron(squadronId, targetLat, targetLng, allUnits) {
    const sq = this.squadrons.get(squadronId);
    if (!sq) return;

    sq.units.forEach((unitId, i) => {
      const unit = allUnits.find(u => u.id === unitId);
      if (!unit) return;

      // Offset in formation
      const offset = this._formationOffset(sq.formation, i, sq.units.length);
      unit.targetLat = targetLat + offset.lat;
      unit.targetLng = targetLng + offset.lng;
      unit.status = 'moving';
    });
  }

  /** Issue attack order to entire squadron */
  attackSquadron(squadronId, targetLat, targetLng, allUnits) {
    const sq = this.squadrons.get(squadronId);
    if (!sq) return;

    sq.units.forEach((unitId) => {
      const unit = allUnits.find(u => u.id === unitId);
      if (!unit) return;
      unit.targetLat = targetLat;
      unit.targetLng = targetLng;
      unit.status = 'attacking';
    });
  }

  /** Get formation offsets */
  _formationOffset(formation, index, total) {
    const spacing = 0.01;
    if (formation === 'line') {
      return { lat: 0, lng: (index - total / 2) * spacing };
    }
    if (formation === 'wedge') {
      const row = Math.floor(index / 2);
      const side = index % 2 === 0 ? -1 : 1;
      return { lat: -row * spacing, lng: side * row * spacing * 0.5 };
    }
    // spread
    const angle = (index / total) * Math.PI * 2;
    return { lat: Math.cos(angle) * spacing * 2, lng: Math.sin(angle) * spacing * 2 };
  }

  /** Get squadron by ID */
  get(id) { return this.squadrons.get(id); }

  /** Get squadron for a unit */
  getForUnit(unitId) {
    for (const sq of this.squadrons.values()) {
      if (sq.units.includes(unitId)) return sq;
    }
    return null;
  }

  /** Get all squadrons for a player */
  getForPlayer(playerUnits) {
    const result = [];
    const unitIds = new Set(playerUnits.map(u => u.id));
    for (const sq of this.squadrons.values()) {
      if (sq.units.some(id => unitIds.has(id))) result.push(sq);
    }
    return result;
  }
}
