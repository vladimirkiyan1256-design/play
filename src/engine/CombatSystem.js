/* ═══════════════════════════════════════════════════════════
   AEROWAR — Combat System
   Resolves attacks between territories, handles AA vs Aircraft,
   produces battle reports and animations.
   ═══════════════════════════════════════════════════════════ */

import { combatPower } from '../builder/StatsCalculator.js';
import { randFloat, randInt } from '../utils/math.js';

/**
 * @typedef {Object} BattleResult
 * @property {boolean} attackerWin
 * @property {number} attackerLosses - number of units lost
 * @property {number} defenderLosses
 * @property {string[]} log - battle events
 * @property {Object[]} animations - visual effects to render
 */

export default class CombatSystem {
  constructor(gameState) {
    this.state = gameState;

    /** Active battle animations */
    this.animations = [];
  }

  /**
   * Execute an attack from one territory to another.
   * @param {string} attackerPlayerId
   * @param {string} fromTerritoryId
   * @param {string} toTerritoryId
   * @returns {BattleResult}
   */
  attack(attackerPlayerId, fromTerritoryId, toTerritoryId) {
    const from = this.state.territoryById[fromTerritoryId];
    const to = this.state.territoryById[toTerritoryId];
    const attacker = this.state.getPlayer(attackerPlayerId);
    const defender = to.ownerId ? this.state.getPlayer(to.ownerId) : null;

    if (!from || !to || !attacker) {
      return { attackerWin: false, attackerLosses: 0, defenderLosses: 0, log: ['Invalid attack'], animations: [] };
    }

    const log = [];
    const anims = [];

    // Gather forces
    const attackForce = this._gatherForce(from, attacker);
    const defendForce = this._gatherDefense(to, defender);

    log.push(`⚔ ${attacker.name} атакует ${to.name}!`);
    log.push(`  Атака: ${attackForce.aircraft.length} самолётов, мощь ${attackForce.totalPower}`);
    log.push(`  Защита: ${defendForce.aircraft.length} самолётов, ${defendForce.aa.length} ПВО, мощь ${defendForce.totalPower}`);

    // Phase 1: AA fires at attacking aircraft
    const aaResult = this._resolveAAPhase(attackForce, defendForce, log);

    // Phase 2: Air-to-air combat (remaining attackers vs defender aircraft)
    const airResult = this._resolveAirCombat(attackForce, defendForce, log);

    // Phase 3: Determine winner
    const attackPowerRemaining = this._calcRemainingPower(attackForce);
    const defendPowerRemaining = this._calcRemainingPower(defendForce);

    // Attack succeeds if attacker has >60% power advantage after combat
    const ratio = attackPowerRemaining / Math.max(1, attackPowerRemaining + defendPowerRemaining);
    const attackerWin = ratio > 0.4 && attackForce.aircraft.some(a => a.alive);

    // Count losses
    const attackerLosses = attackForce.aircraft.filter(a => !a.alive).length;
    const defenderLosses = defendForce.aircraft.filter(a => !a.alive).length + defendForce.aa.filter(a => !a.alive).length;

    if (attackerWin) {
      log.push(`🏆 ПОБЕДА! ${attacker.name} захватил ${to.name}`);
      this._captureTerritory(to, attacker, defender);
    } else {
      log.push(`❌ ПОРАЖЕНИЕ. Атака отбита.`);
    }

    // Generate animation data
    anims.push({
      type: 'attack_line',
      from: from.centroid,
      to: to.centroid,
      success: attackerWin,
      timestamp: Date.now(),
      duration: 2000,
    });

    // Remove destroyed units from player inventories
    this._removeDestroyedUnits(attackForce, attacker);
    this._removeDestroyedUnits(defendForce, defender);

    // Add animations
    this.animations.push(...anims);

    return {
      attackerWin,
      attackerLosses,
      defenderLosses,
      log,
      animations: anims,
    };
  }

  /**
   * Gather attacking force from territory.
   */
  _gatherForce(territory, player) {
    // Use all aircraft the player has (simplified: global army)
    const aircraft = player.vehicles.map(v => ({
      ...v,
      alive: true,
      currentHp: v.hp,
    }));
    const totalPower = aircraft.reduce((s, a) => s + a.power, 0);
    return { aircraft, aa: [], totalPower };
  }

  /**
   * Gather defending force.
   */
  _gatherDefense(territory, defender) {
    const aircraft = defender ? defender.vehicles.map(v => ({
      ...v,
      alive: true,
      currentHp: v.hp,
    })) : [];

    const aa = defender ? defender.airDefenses.map(v => ({
      ...v,
      alive: true,
      currentHp: v.hp || 100,
    })) : [];

    // Territory has inherent defense based on population
    const garrisonPower = Math.floor(territory.population / 5000000);

    const totalPower = aircraft.reduce((s, a) => s + a.power, 0)
                     + aa.reduce((s, a) => s + a.power, 0)
                     + garrisonPower;

    return { aircraft, aa, totalPower, garrisonPower };
  }

  /**
   * Phase 1: AA systems fire at attacking aircraft.
   * Each AA system gets shots based on its stats.
   */
  _resolveAAPhase(attackForce, defendForce, log) {
    for (const aa of defendForce.aa) {
      if (!aa.alive) continue;

      // Each AA gets 1-3 shots
      const shots = Math.max(1, Math.floor(aa.power / 15));
      for (let i = 0; i < shots; i++) {
        // Pick random alive attacker
        const aliveAttackers = attackForce.aircraft.filter(a => a.alive);
        if (aliveAttackers.length === 0) break;

        const target = aliveAttackers[randInt(0, aliveAttackers.length - 1)];

        // Hit chance based on AA power vs target stealth/speed
        const hitChance = 0.3 + (aa.power / 100) * 0.3 - (target.stats?.stealth || 0) * 0.01;
        if (randFloat(0, 1) < hitChance) {
          const damage = randInt(15, 40) + Math.floor(aa.power * 0.3);
          target.currentHp -= damage;
          if (target.currentHp <= 0) {
            target.alive = false;
            log.push(`  🎯 ПВО сбил ${target.name}!`);
          }
        }
      }
    }
  }

  /**
   * Phase 2: Air-to-air combat.
   * Attackers and defenders trade shots in rounds.
   */
  _resolveAirCombat(attackForce, defendForce, log) {
    const maxRounds = 5;

    for (let round = 0; round < maxRounds; round++) {
      const aliveAttackers = attackForce.aircraft.filter(a => a.alive);
      const aliveDefenders = defendForce.aircraft.filter(a => a.alive);

      if (aliveAttackers.length === 0 || aliveDefenders.length === 0) break;

      // Attackers fire
      for (const unit of aliveAttackers) {
        const target = aliveDefenders[randInt(0, aliveDefenders.length - 1)];
        if (!target || !target.alive) continue;

        const hitChance = 0.4 + (unit.power / 100) * 0.2;
        if (randFloat(0, 1) < hitChance) {
          const damage = randInt(10, 30) + Math.floor(unit.power * 0.25);
          target.currentHp -= damage;
          if (target.currentHp <= 0) {
            target.alive = false;
            log.push(`  ✈ ${unit.name} сбил ${target.name}`);
          }
        }
      }

      // Defenders fire back
      for (const unit of aliveDefenders.filter(a => a.alive)) {
        const targets = aliveAttackers.filter(a => a.alive);
        if (targets.length === 0) break;
        const target = targets[randInt(0, targets.length - 1)];

        const hitChance = 0.35 + (unit.power / 100) * 0.2;
        if (randFloat(0, 1) < hitChance) {
          const damage = randInt(10, 30) + Math.floor(unit.power * 0.25);
          target.currentHp -= damage;
          if (target.currentHp <= 0) {
            target.alive = false;
            log.push(`  ✈ ${unit.name} (защита) сбил ${target.name}`);
          }
        }
      }
    }
  }

  /**
   * Calculate remaining combat power of a force.
   */
  _calcRemainingPower(force) {
    const air = force.aircraft.filter(a => a.alive).reduce((s, a) => s + a.power, 0);
    const aa = force.aa.filter(a => a.alive).reduce((s, a) => s + a.power, 0);
    return air + aa + (force.garrisonPower || 0);
  }

  /**
   * Transfer territory ownership after capture.
   */
  _captureTerritory(territory, attacker, previousOwner) {
    territory.setOwner(attacker.id, attacker.colorIndex);
    attacker.territoriesOwned = this.state.getPlayerTerritories(attacker.id).length;

    if (previousOwner) {
      previousOwner.territoriesOwned = this.state.getPlayerTerritories(previousOwner.id).length;
      if (previousOwner.territoriesOwned === 0 && !previousOwner.isHuman) {
        previousOwner.alive = false;
        this.state.addEvent(`💀 ${previousOwner.name} уничтожен!`, 'war');
      }
    }
  }

  /**
   * Remove destroyed units from player's vehicle/airDefense arrays.
   */
  _removeDestroyedUnits(force, player) {
    if (!player) return;

    const destroyedIds = new Set();
    for (const unit of force.aircraft) {
      if (!unit.alive) destroyedIds.add(unit.id);
    }
    for (const unit of force.aa) {
      if (!unit.alive) destroyedIds.add(unit.id);
    }

    player.vehicles = player.vehicles.filter(v => !destroyedIds.has(v.id));
    player.airDefenses = player.airDefenses.filter(v => !destroyedIds.has(v.id));
  }

  /**
   * Update active animations (call each frame).
   * @param {number} dt - Delta time in seconds
   */
  updateAnimations(dt) {
    const now = Date.now();
    this.animations = this.animations.filter(a => now - a.timestamp < a.duration);
  }

  /**
   * Render battle animations on the map.
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../engine/Camera.js').default} camera
   */
  renderAnimations(ctx, camera) {
    const now = Date.now();

    for (const anim of this.animations) {
      const progress = (now - anim.timestamp) / anim.duration;
      if (progress > 1) continue;

      if (anim.type === 'attack_line') {
        const [fx, fy] = camera.worldToScreen(anim.from[0], anim.from[1]);
        const [tx, ty] = camera.worldToScreen(anim.to[0], anim.to[1]);

        // Animated dash from→to
        const currentX = fx + (tx - fx) * Math.min(progress * 2, 1);
        const currentY = fy + (ty - fy) * Math.min(progress * 2, 1);

        // Trail
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = anim.success
          ? `rgba(0, 230, 118, ${1 - progress})`
          : `rgba(255, 23, 68, ${1 - progress})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Impact flash
        if (progress > 0.4 && progress < 0.8) {
          const flash = 1 - Math.abs(progress - 0.6) * 5;
          const radius = 8 + flash * 15;
          ctx.beginPath();
          ctx.arc(tx, ty, radius, 0, Math.PI * 2);
          ctx.fillStyle = anim.success
            ? `rgba(0, 230, 118, ${flash * 0.5})`
            : `rgba(255, 23, 68, ${flash * 0.5})`;
          ctx.fill();
        }

        // Icon at head
        if (progress < 0.5) {
          ctx.font = '16px sans-serif';
          ctx.fillText('✈', currentX - 8, currentY - 8);
        }
      }
    }
  }
}
