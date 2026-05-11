/* ═══════════════════════════════════════════════════════════
   AEROWAR v2.1 — Game Engine (Real-Time, Territory-from-Units)
   ═══════════════════════════════════════════════════════════ */

import LeafletMap from '../map/LeafletMap.js';
import TerrainChecker from '../map/TerrainChecker.js';
import GameState from '../state/GameState.js';
import VehicleBuilder from '../builder/VehicleBuilder.js';
import UIManager from '../ui/UIManager.js';
import SquadronManager from '../units/Squadron.js';
import ThreeOverlay from '../render/ThreeOverlay.js';

const ECONOMY_INTERVAL = 10000;
const AI_INTERVAL = 8000;
const EXPAND_INTERVAL = 3000;
const AMMO_REPAIR_INTERVAL = 4000;
const WAREHOUSE_INTERVAL = 5000;
const UNIT_SPEED_BASE = 0.0003;

export default class GameEngine {
  constructor() {
    this.state = new GameState();
    this.builder = new VehicleBuilder(this.state);
    this.squadrons = new SquadronManager();
    this.leafletMap = null;
    this.terrain = null;
    this.threeOverlay = null;
    this.ui = null;
    this.animations = [];
    this.gameTime = 0;
    this.lastTimestamp = 0;
    this.paused = false;
    this._economyAcc = 0;
    this._aiAcc = 0;
    this._expandAcc = 0;
    this._ammoAcc = 0;
    this._warehouseAcc = 0;
    this._ctxLatLng = null;
    this._recentAttacks = 0;
  }

  async init() {
    const fill = document.getElementById('loading-fill');
    fill.style.width = '20%';

    this.leafletMap = new LeafletMap(
      document.getElementById('map-container'),
      (ll) => this._onMapClick(ll),
      (ll, px) => this._onContextMenu(ll, px),
    );
    this.terrain = new TerrainChecker(this.leafletMap);
    fill.style.width = '50%';

    // Three.js overlay
    this.threeOverlay = new ThreeOverlay();
    await this.threeOverlay.init();
    fill.style.width = '60%';

    this.state.init();
    fill.style.width = '80%';

    this.ui = new UIManager(this.state, this.builder, this);
    fill.style.width = '100%';

    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('fade-out');
      setTimeout(() => document.getElementById('loading-screen').style.display = 'none', 800);
    }, 500);

    document.getElementById('btn-pause')?.addEventListener('click', () => this.togglePause());

    this.lastTimestamp = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  // ═══════════ GAME LOOP ═══════════

  _loop(timestamp) {
    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (!this.paused && this.state.phase === 'playing') {
      this.gameTime += dt;
      this._update(dt);
    }

    this._render();
    const now = Date.now();
    this.animations = this.animations.filter(a => now - a.startTime < a.duration);
    requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    this._economyAcc += dt * 1000;
    if (this._economyAcc >= ECONOMY_INTERVAL) { this._economyAcc -= ECONOMY_INTERVAL; this._tickEconomy(); }

    this._expandAcc += dt * 1000;
    if (this._expandAcc >= EXPAND_INTERVAL) { this._expandAcc -= EXPAND_INTERVAL; this._tickExpand(); }

    this._aiAcc += dt * 1000;
    if (this._aiAcc >= AI_INTERVAL) { this._aiAcc -= AI_INTERVAL; this._tickAI(); }

    this._ammoAcc += dt * 1000;
    if (this._ammoAcc >= AMMO_REPAIR_INTERVAL) { this._ammoAcc -= AMMO_REPAIR_INTERVAL; this._tickAmmoRepair(); }

    this._warehouseAcc += dt * 1000;
    if (this._warehouseAcc >= WAREHOUSE_INTERVAL) { this._warehouseAcc -= WAREHOUSE_INTERVAL; this._tickWarehouses(); }

    this._moveUnits(dt);

    const mins = Math.floor(this.gameTime / 60);
    const secs = Math.floor(this.gameTime % 60);
    const timeEl = document.getElementById('hud-time-value');
    if (timeEl) timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    const areaEl = document.getElementById('hud-territory-value');
    if (areaEl && this.state.humanPlayer) {
      areaEl.textContent = this.leafletMap.getAreaKm2(this.state.humanPlayer.id).toLocaleString('ru-RU') + ' км²';
    }
  }

  _render() {
    const units = this.state.units.filter(u => u.status !== 'loaded').map(u => ({
      id: u.id, lat: u.lat, lng: u.lng, icon: u.icon, name: u.name,
      colorIndex: u.colorIndex, hp: u.hp, maxHp: u.maxHp,
      selected: u.selected, targetLat: u.targetLat, targetLng: u.targetLng,
      type: u.type, domain: u.domain,
    }));
    const buildings = this.state.buildings.map(b => ({
      lat: b.lat, lng: b.lng, icon: b.icon, name: b.name,
      colorIndex: b.colorIndex, radiusKm: b.radiusKm, type: b.type,
    }));

    // Toggle 2D/3D rendering based on zoom
    const zoom = this.leafletMap.map.getZoom();
    const is3D = this.threeOverlay?.active && this.threeOverlay.isActiveAtZoom(zoom);
    this.leafletMap.show3D = is3D;

    this.leafletMap.render(units, buildings, this.animations);

    // Three.js 3D overlay at high zoom
    if (this.threeOverlay?.active) {
      this.threeOverlay.update(this.leafletMap, units, buildings, this.animations);
    }
  }

  // ═══════════ TICKS ═══════════

  _tickEconomy() {
    for (const player of this.state.players) {
      const area = this.leafletMap.getAreaKm2(player.id);
      const income = Math.round(area * 0.5 + player.buildings.length * 200);
      player.money += income;
      const upkeep = player.units.length * 30 + player.buildings.length * 10;
      player.money = Math.max(0, player.money - upkeep);
    }

    const metrics = {
      totalBuildings: this.state.buildings.length,
      totalUnits: this.state.units.length,
      recentAttacks: this._recentAttacks,
      totalTerritory: this.leafletMap.getAreaKm2(this.state.humanPlayer?.id || ''),
      totalPower: this.state.units.reduce((s, u) => s + u.power, 0),
    };
    this.state.tickStocks(metrics);
    this._recentAttacks = Math.max(0, this._recentAttacks - 1);
    this.ui?.updateHUD();
  }

  /** Territory expansion FROM UNITS (not buildings) */
  _tickExpand() {
    for (const player of this.state.players) {
      // Units expand territory around them as they exist/move
      for (const u of player.units) {
        if (u.status === 'loaded') continue;
        const captureRadius = u.domain === 'air' ? 8 : u.domain === 'sea' ? 6 : 4;
        this.leafletMap.claimArea(u.lat, u.lng, captureRadius, player.id, player.colorIndex);
      }

      // Slow passive expansion at borders
      const rate = player.isHuman ? 0.15 : 0.1;
      this.leafletMap.expandTerritory(player.id, player.colorIndex, rate);
    }
    this.leafletMap.invalidate();
  }

  /** Warehouse production: fill ammo over time */
  _tickWarehouses() {
    for (const b of this.state.buildings) {
      if (b.type !== 'warehouse') continue;
      if (b.ammo < b.ammoMax) {
        b.ammo = Math.min(b.ammoMax, b.ammo + b.productionRate);
      }
    }
  }

  /** Repair + ammo resupply from nearby buildings */
  _tickAmmoRepair() {
    for (const u of this.state.units) {
      if (u.status === 'loaded') continue;

      for (const b of this.state.buildings) {
        if (b.ownerId !== u.ownerId) continue;
        const dist = Math.sqrt((u.lat - b.lat) ** 2 + (u.lng - b.lng) ** 2);
        const radiusDeg = b.radiusKm / 111.32;
        if (dist > radiusDeg) continue;

        // Repair base: heal units
        if (b.type === 'repair' && u.hp < u.maxHp) {
          u.hp = Math.min(u.maxHp, u.hp + (b.repairRate || 5));
        }

        // Warehouse: resupply ammo
        if (b.type === 'warehouse' && u.ammo < u.ammoMax && b.ammo > 0) {
          const need = u.ammoMax - u.ammo;
          const give = Math.min(need, b.ammo, 10);
          u.ammo += give;
          b.ammo -= give;
        }
      }
    }
  }

  _tickAI() {
    for (const player of this.state.players) {
      if (player.isHuman) continue;
      this._aiAction(player);
    }
  }

  _aiAction(player) {
    if (player.buildings.length === 0) return;
    const hq = player.buildings[0];

    // Build buildings
    if (player.money > 5000 && player.buildings.length < 8 && Math.random() < 0.3) {
      const angle = Math.random() * Math.PI * 2;
      const d = 0.3 + Math.random() * 0.5;
      const lat = hq.lat + Math.cos(angle) * d;
      const lng = hq.lng + Math.sin(angle) * d;
      const types = ['outpost', 'airfield', 'barracks', 'warehouse', 'repair'];
      const type = types[Math.floor(Math.random() * types.length)];

      // Validate: no buildings on water
      if (!this.terrain.isWater(lat, lng)) {
        const cost = this.state.getBuildingCost(type);
        this.state.addBuilding(player, type, lat, lng);
        player.money -= cost;
      }
    }

    // Build units
    if (player.money > 8000 && player.units.length < 15 && Math.random() < 0.4) {
      const landTypes = ['fighter', 'infantry', 'tank', 'airborne', 'aa', 'missile'];
      const seaTypes = ['ship', 'submarine'];
      const type = Math.random() < 0.8
        ? landTypes[Math.floor(Math.random() * landTypes.length)]
        : seaTypes[Math.floor(Math.random() * seaTypes.length)];
      const base = player.buildings[Math.floor(Math.random() * player.buildings.length)];
      const lat = base.lat + (Math.random() - 0.5) * 0.1;
      const lng = base.lng + (Math.random() - 0.5) * 0.1;
      this.state.addUnit(player, type, lat, lng);
      player.money -= this.state.getUnitDef(type)?.cost || 5000;
    }

    // Attack
    if (player.units.length > 3 && Math.random() < 0.3) {
      const att = player.units[Math.floor(Math.random() * player.units.length)];
      this.leafletMap.attackCells(att.lat, att.lng, 15, player.id, player.colorIndex, 10);
    }

    // Move units
    for (const unit of player.units) {
      if (unit.targetLat == null && Math.random() < 0.1) {
        const a = Math.random() * Math.PI * 2;
        const d = 0.1 + Math.random() * 0.3;
        unit.targetLat = unit.lat + Math.cos(a) * d;
        unit.targetLng = unit.lng + Math.sin(a) * d;
      }
    }
  }

  _moveUnits(dt) {
    for (const unit of this.state.units) {
      if (unit.targetLat == null || unit.targetLng == null) continue;
      if (unit.status === 'loaded') continue;

      // Move cargo with transport
      for (const c of (unit.cargo || [])) {
        c.lat = unit.lat; c.lng = unit.lng;
      }

      const dlat = unit.targetLat - unit.lat;
      const dlng = unit.targetLng - unit.lng;
      const dist = Math.sqrt(dlat * dlat + dlng * dlng);

      if (dist < 0.005) {
        unit.lat = unit.targetLat; unit.lng = unit.targetLng;
        unit.targetLat = null; unit.targetLng = null;
        unit.status = 'idle';
        this.leafletMap.invalidate();
        continue;
      }

      const speed = UNIT_SPEED_BASE * (unit.speed || 1) * dt * 60;
      const ratio = Math.min(speed / dist, 1);
      unit.lat += dlat * ratio;
      unit.lng += dlng * ratio;
      unit.status = 'moving';
      this.leafletMap.invalidate();
    }
  }

  // ═══════════ MAP EVENTS ═══════════

  _onMapClick(latlng) {
    document.getElementById('context-menu')?.classList.add('ctx-hidden');
    const player = this.state.humanPlayer;
    if (!player) return;

    if (this.state.phase === 'setup') { this._setupBase(latlng.lat, latlng.lng); return; }

    const clicked = this.state.findUnitAt(latlng.lat, latlng.lng, 0.02);
    if (clicked && clicked.ownerId === player.id) {
      this.state.deselectAll();
      clicked.selected = true;
      this.leafletMap.invalidate();
      this.ui?.showUnitInfo(clicked);
      return;
    }

    const selected = this.state.getSelectedUnit();
    if (selected && selected.ownerId === player.id) {
      selected.targetLat = latlng.lat;
      selected.targetLng = latlng.lng;
      selected.status = 'moving';
      this.state.addEvent(`➡️ ${selected.name} перемещается`);
      this.leafletMap.invalidate();
      return;
    }

    this.state.deselectAll();
    this.leafletMap.invalidate();
  }

  _onContextMenu(latlng, pixel) {
    this._ctxLatLng = latlng;
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    menu.style.left = pixel.x + 'px';
    menu.style.top = pixel.y + 'px';
    menu.classList.remove('ctx-hidden');

    if (!menu._bound) {
      menu._bound = true;
      menu.addEventListener('click', (e) => {
        const action = e.target.closest('.ctx-item')?.dataset.action;
        if (action) this._handleContextAction(action);
        menu.classList.add('ctx-hidden');
      });
    }
  }

  _handleContextAction(action) {
    const player = this.state.humanPlayer;
    if (!player || !this._ctxLatLng) return;
    const { lat, lng } = this._ctxLatLng;

    // Build actions
    const buildTypes = {
      'build-hq': 'hq', 'build-airfield': 'airfield', 'build-barracks': 'barracks',
      'build-shipyard': 'shipyard', 'build-outpost': 'outpost', 'build-radar': 'radar',
      'build-warehouse': 'warehouse', 'build-repair': 'repair',
    };

    if (buildTypes[action]) {
      const type = buildTypes[action];
      const cost = this.state.getBuildingCost(type);

      // Water validation for buildings
      if (this.terrain.isWater(lat, lng)) {
        this.state.addEvent('❌ Нельзя строить здания на воде!');
        this.ui?.updateEvents();
        return;
      }

      if (player.money < cost) {
        this.state.addEvent(`❌ Недостаточно средств ($${cost.toLocaleString()})`);
        this.ui?.updateEvents();
        return;
      }

      this.state.addBuilding(player, type, lat, lng);
      player.money -= cost;
      // Small initial claim for new building
      this.leafletMap.claimArea(lat, lng, 5, player.id, player.colorIndex);
      this.state.addEvent(`🏗️ Построен ${this.state.buildings.at(-1)?.name}`);
      this.ui?.updateHUD();
      this.ui?.updateEvents();
      this.leafletMap.invalidate();
      return;
    }

    if (action === 'place-unit') { this.ui?.showUnitPlacement(lat, lng); return; }

    if (action === 'move-unit') {
      const selected = this.state.getSelectedUnit();
      if (selected) {
        selected.targetLat = lat; selected.targetLng = lng; selected.status = 'moving';
        this.leafletMap.invalidate();
      }
      return;
    }

    if (action === 'attack') {
      const selected = this.state.getSelectedUnit();
      if (selected) {
        if (selected.ammo <= 0) {
          this.state.addEvent('❌ Нет боеприпасов! Отправьте к складу.');
          this.ui?.updateEvents();
          return;
        }
        selected.ammo = Math.max(0, selected.ammo - 5);
        this._recentAttacks++;
        this.animations.push({
          type: 'missile', startTime: Date.now(), duration: 2000,
          fromLat: selected.lat, fromLng: selected.lng, toLat: lat, toLng: lng,
        });
        setTimeout(() => {
          this.leafletMap.attackCells(lat, lng, 10, player.id, player.colorIndex, selected.power || 15);
          this.animations.push({ type: 'explosion', startTime: Date.now(), duration: 1500, lat, lng });
          this.state.addEvent(`💥 Удар по (${lat.toFixed(2)}, ${lng.toFixed(2)})`);
          this.ui?.updateEvents();
        }, 1800);
      }
      return;
    }

    if (action === 'load-infantry') {
      const selected = this.state.getSelectedUnit();
      if (selected && selected.capacity > 0) {
        const nearby = this.state.units.find(u =>
          u.ownerId === player.id &&
          ['infantry','airborne','marine','specops','sniper','engineer'].includes(u.type) &&
          u.status !== 'loaded' &&
          Math.sqrt((u.lat - selected.lat) ** 2 + (u.lng - selected.lng) ** 2) < 0.03
        );
        if (nearby) {
          this.state.loadCargo(selected, nearby);
          this.state.addEvent(`📦 ${nearby.name} загружена в ${selected.name}`);
          this.ui?.updateEvents();
        } else {
          this.state.addEvent('❌ Нет пехоты рядом');
          this.ui?.updateEvents();
        }
      }
      return;
    }

    if (action === 'unload-cargo') {
      const selected = this.state.getSelectedUnit();
      if (selected && selected.cargo?.length > 0) {
        const count = this.state.unloadCargo(selected);
        this.state.addEvent(`📦 Выгружено ${count} отрядов`);
        this.ui?.updateEvents();
      }
      return;
    }

    if (action === 'create-squadron') {
      const selectedUnits = this.state.getSelectedUnits();
      if (selectedUnits.length >= 2) {
        const sq = this.squadrons.create(null, selectedUnits);
        if (sq) {
          this.state.addEvent(`⭐ Создана эскадрилья: ${sq.name}`);
          this.ui?.updateEvents();
        }
      }
      return;
    }
  }

  _setupBase(lat, lng) {
    // Don't place base on water
    if (this.terrain.isWater(lat, lng)) {
      this.state.addEvent('❌ Нельзя ставить базу на воде!');
      return;
    }

    const player = this.state.humanPlayer;
    this.state.addBuilding(player, 'hq', lat, lng);
    // Small initial territory (like OpenFront)
    this.leafletMap.claimArea(lat, lng, 5, player.id, player.colorIndex);
    this.leafletMap.flyTo(lat, lng, 7);

    // Starting units
    this.state.addUnit(player, 'fighter', lat + 0.05, lng + 0.05);
    this.state.addUnit(player, 'fighter', lat + 0.05, lng - 0.05);
    this.state.addUnit(player, 'infantry', lat - 0.03, lng);
    this.state.addUnit(player, 'airborne', lat - 0.04, lng + 0.02);
    this.state.addUnit(player, 'tank', lat - 0.05, lng + 0.03);
    this.state.addUnit(player, 'marine', lat - 0.06, lng - 0.02);

    this._setupAI();
    this.state.phase = 'playing';
    this.state.addEvent('🏛️ База размещена! Территория расширяется от юнитов.');
    this.ui?.updateHUD();
    this.ui?.updateEvents();
  }

  _setupAI() {
    const aiLocations = [
      { lat: 55.75, lng: 37.62 }, { lat: 39.9, lng: 116.4 },
      { lat: 38.9, lng: -77.04 }, { lat: 48.86, lng: 2.35 },
      { lat: -15.78, lng: -47.93 },
    ];

    for (let i = 1; i < this.state.players.length; i++) {
      const player = this.state.players[i];
      const loc = aiLocations[(i - 1) % aiLocations.length];
      const j = () => (Math.random() - 0.5) * 2;

      this.state.addBuilding(player, 'hq', loc.lat + j(), loc.lng + j());
      this.state.addBuilding(player, 'warehouse', loc.lat + j() * 0.5, loc.lng + j() * 0.5);
      this.leafletMap.claimArea(loc.lat, loc.lng, 5, player.id, player.colorIndex);

      this.state.addUnit(player, 'fighter', loc.lat + 0.1, loc.lng + 0.1);
      this.state.addUnit(player, 'infantry', loc.lat - 0.05, loc.lng);
      this.state.addUnit(player, 'tank', loc.lat - 0.1, loc.lng + 0.05);
    }
  }

  togglePause() {
    this.paused = !this.paused;
    const btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = this.paused ? '▶' : '⏸';
  }

  launchMissile(fromLat, fromLng, toLat, toLng) {
    this.animations.push({ type: 'missile', startTime: Date.now(), duration: 2500, fromLat, fromLng, toLat, toLng });
  }

  explode(lat, lng) {
    this.animations.push({ type: 'explosion', startTime: Date.now(), duration: 1500, lat, lng });
  }
}
