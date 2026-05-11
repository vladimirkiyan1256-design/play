/* ═══════════════════════════════════════════════════════════
   AEROWAR — AI Player Controller
   Different strategies: aggressive, defensive, trader
   ═══════════════════════════════════════════════════════════ */

import { randFloat, randInt, randPick, shuffle } from '../utils/math.js';
import { AIRCRAFT_CATEGORIES, AA_CATEGORIES } from '../builder/components.js';

export default class AIController {
  /**
   * @param {import('../state/GameState.js').default} state
   * @param {import('./CombatSystem.js').default} combatSystem
   * @param {import('../builder/VehicleBuilder.js').default} vehicleBuilder
   */
  constructor(state, combatSystem, vehicleBuilder) {
    this.state = state;
    this.combat = combatSystem;
    this.builder = vehicleBuilder;
  }

  /**
   * Execute AI turn for all AI players.
   */
  tick() {
    for (const player of this.state.players) {
      if (player.isHuman || !player.alive) continue;

      const strategy = this._getStrategy(player);

      // Economy: collect and spend
      this._economyPhase(player, strategy);

      // Military: build units if needed
      this._buildPhase(player, strategy);

      // Expansion / Attack
      this._actionPhase(player, strategy);

      // Trading
      this._tradePhase(player, strategy);
    }
  }

  /**
   * Determine AI strategy based on aiType and game state.
   */
  _getStrategy(player) {
    const territories = this.state.getPlayerTerritories(player.id);
    const totalPower = player.vehicles.reduce((s, v) => s + v.power, 0)
                     + player.airDefenses.reduce((s, v) => s + v.power, 0);
    const isWeak = totalPower < 30;
    const isRich = player.money > 30000;

    switch (player.aiType) {
      case 'easy':
        return { aggression: 0.1, expansion: 0.2, buildRate: 0.3, tradeRate: 0.1 };
      case 'hard':
        return {
          aggression: isRich ? 0.4 : 0.15,
          expansion: 0.35,
          buildRate: 0.6,
          tradeRate: 0.3,
        };
      case 'medium':
      default:
        return {
          aggression: isWeak ? 0.05 : 0.2,
          expansion: 0.25,
          buildRate: 0.45,
          tradeRate: 0.15,
        };
    }
  }

  /**
   * Economy: nothing special for now (income is auto-collected in nextTurn).
   */
  _economyPhase(player, strategy) {
    // Future: trade resources, adjust tax policy, etc.
  }

  /**
   * Build military units if has money and need.
   */
  _buildPhase(player, strategy) {
    if (randFloat(0, 1) > strategy.buildRate) return;
    if (player.money < 5000) return;

    // Build aircraft if fewer than territories * 2
    const territories = this.state.getPlayerTerritories(player.id);
    const desiredAircraft = territories.length * 2;

    if (player.vehicles.length < desiredAircraft) {
      // Check if we have a design, if not create one
      let design = player.designs[0];
      if (!design) {
        // Create a simple design
        const components = this._pickComponents(false);
        design = this.builder.createDesign(
          `${player.name}-${randInt(1, 99)}`,
          components,
          false
        );
        player.designs.push(design);
      }

      if (player.money >= design.cost) {
        player.money -= design.cost;
        const vehicle = this.builder.build(design.id, player.id);
        player.vehicles.push(vehicle);
        this.state.addEvent(`🏭 ${player.name} построил ${vehicle.name}`, 'info');
      }
    }

    // Build AA if fewer than territories
    if (player.airDefenses.length < territories.length && player.money > 8000) {
      let aaDesign = player.designs.find(d => d.isAA);
      if (!aaDesign) {
        const components = this._pickComponents(true);
        aaDesign = this.builder.createDesign(
          `ПВО-${player.name}`,
          components,
          true
        );
        player.designs.push(aaDesign);
      }

      if (player.money >= aaDesign.cost) {
        player.money -= aaDesign.cost;
        const unit = this.builder.build(aaDesign.id, player.id);
        player.airDefenses.push(unit);
      }
    }
  }

  /**
   * Pick components for AI vehicle design.
   */
  _pickComponents(isAA) {
    const categories = isAA ? AA_CATEGORIES : AIRCRAFT_CATEGORIES;

    const result = {};
    for (const cat of categories) {
      if (cat.required && cat.items.length > 0) {
        if (cat.max > 1) {
          // Pick 1-2 items
          const count = Math.min(cat.max, randInt(1, 2));
          result[`${cat.id}_list`] = [];
          const shuffled = [...cat.items];
          shuffle(shuffled);
          for (let i = 0; i < count && i < shuffled.length; i++) {
            result[`${cat.id}_list`].push(shuffled[i]);
          }
        } else {
          // Pick random item, slight preference for mid-tier
          const idx = Math.min(cat.items.length - 1, randInt(0, Math.min(2, cat.items.length - 1)));
          result[cat.id] = cat.items[idx];
        }
      }
    }

    return result;
  }

  /**
   * Expand to neutral neighbors or attack enemy territories.
   */
  _actionPhase(player, strategy) {
    const territories = this.state.getPlayerTerritories(player.id);

    // Try expansion first
    if (randFloat(0, 1) < strategy.expansion) {
      for (const terr of territories) {
        for (const nId of terr.neighborIds) {
          const neighbor = this.state.territoryById[nId];
          if (neighbor && neighbor.isNeutral) {
            const cost = 1000;
            if (player.money >= cost) {
              player.money -= cost;
              this.state.claimTerritory(neighbor, player);
              this.state.addEvent(`🏴 ${player.name} расширился: ${neighbor.name}`, 'war');
              return; // One action per turn
            }
          }
        }
      }
    }

    // Try attacking enemy territories
    if (randFloat(0, 1) < strategy.aggression && player.vehicles.length > 0) {
      for (const terr of territories) {
        for (const nId of terr.neighborIds) {
          const neighbor = this.state.territoryById[nId];
          if (neighbor && !neighbor.isNeutral && neighbor.ownerId !== player.id) {
            // Only attack if we think we can win
            const enemyPlayer = this.state.getPlayer(neighbor.ownerId);
            const ourPower = player.vehicles.reduce((s, v) => s + v.power, 0);
            const theirPower = enemyPlayer
              ? enemyPlayer.vehicles.reduce((s, v) => s + v.power, 0) + enemyPlayer.airDefenses.reduce((s, v) => s + v.power, 0)
              : 0;

            if (ourPower > theirPower * 0.8) {
              const result = this.combat.attack(player.id, terr.id, neighbor.id);
              if (result.attackerWin) {
                this.state.addEvent(`⚔ ${player.name} захватил ${neighbor.name}!`, 'war');
              } else {
                this.state.addEvent(`⚔ ${player.name} атаковал ${neighbor.name} — отбит`, 'war');
              }
              return;
            }
          }
        }
      }
    }
  }

  /**
   * Simple AI stock trading.
   */
  _tradePhase(player, strategy) {
    if (randFloat(0, 1) > strategy.tradeRate) return;
    if (player.money < 2000) return;

    const stocks = this.state.stocks;
    // Buy a random commodity stock if price seems low
    const commodities = stocks.filter(s => !s.playerId);
    if (commodities.length === 0) return;

    const stock = randPick(commodities);
    const sharesToBuy = randInt(1, 5);
    const cost = stock.price * sharesToBuy;

    if (player.money >= cost) {
      player.money -= cost;
      if (!player.portfolio[stock.id]) {
        player.portfolio[stock.id] = { shares: 0, avgCost: 0 };
      }
      const h = player.portfolio[stock.id];
      h.avgCost = (h.avgCost * h.shares + cost) / (h.shares + sharesToBuy);
      h.shares += sharesToBuy;
    }

    // Sell if we have stocks that gained value
    for (const [stockId, holding] of Object.entries(player.portfolio)) {
      const s = stocks.find(st => st.id === stockId);
      if (!s) continue;
      if (s.price > holding.avgCost * 1.2 && randFloat(0, 1) < 0.3) {
        // Sell half
        const sellCount = Math.floor(holding.shares / 2);
        if (sellCount > 0) {
          player.money += s.price * sellCount;
          holding.shares -= sellCount;
          if (holding.shares <= 0) delete player.portfolio[stockId];
        }
      }
    }
  }
}
