/* ═══════════════════════════════════════════════════════════
   AEROWAR v2.1 — Game State (Real-Time, Ammo, Cargo, Predictions)
   ═══════════════════════════════════════════════════════════ */

import Player from './Player.js';
import { ECONOMY, STOCK } from '../utils/constants.js';
import { randInt, randFloat, uid } from '../utils/math.js';

const BUILDING_DEFS = {
  hq:        { name: 'Штаб',      icon: '🏛️', radiusKm: 30, cost: 10000 },
  airfield:  { name: 'Аэродром',  icon: '🛫', radiusKm: 20, cost: 5000 },
  barracks:  { name: 'Казарма',   icon: '🏕️', radiusKm: 15, cost: 3000 },
  shipyard:  { name: 'Верфь',     icon: '⚓', radiusKm: 18, cost: 8000 },
  outpost:   { name: 'Аванпост',  icon: '🏴', radiusKm: 12, cost: 1500 },
  radar:     { name: 'Радар',     icon: '📡', radiusKm: 8,  cost: 6000 },
  warehouse: { name: 'Склад',     icon: '📦', radiusKm: 20, cost: 4000 },
  repair:    { name: 'Рембаза',   icon: '🔧', radiusKm: 15, cost: 5000 },
};

const UNIT_DEFS = {
  // Aircraft
  fighter:   { name: 'Истребитель',    icon: '✈️',  hp: 100, power: 25, speed: 3,   cost: 8000,  domain: 'air',   capacity: 0,  ammoMax: 60 },
  bomber:    { name: 'Бомбардировщик', icon: '💣',  hp: 80,  power: 40, speed: 2,   cost: 12000, domain: 'air',   capacity: 0,  ammoMax: 40 },
  helicopter:{ name: 'Вертолёт',      icon: '🚁',  hp: 70,  power: 20, speed: 1.5, cost: 6000,  domain: 'air',   capacity: 1,  ammoMax: 50 },
  awacs:     { name: 'ДРЛО',          icon: '🛸',  hp: 60,  power: 5,  speed: 1.8, cost: 20000, domain: 'air',   capacity: 0,  ammoMax: 0 },
  attacker:  { name: 'Штурмовик',     icon: '🛩️', hp: 90,  power: 35, speed: 2,   cost: 10000, domain: 'air',   capacity: 0,  ammoMax: 50 },
  // Ground
  tank:      { name: 'Танк',          icon: '🛡️', hp: 150, power: 30, speed: 0.5, cost: 7000,  domain: 'land',  capacity: 0,  ammoMax: 40 },
  aa:        { name: 'ПВО',           icon: '🎯',  hp: 90,  power: 22, speed: 0.4, cost: 6000,  domain: 'land',  capacity: 0,  ammoMax: 30 },
  missile:   { name: 'РСЗО',         icon: '🚀',  hp: 60,  power: 45, speed: 0.3, cost: 10000, domain: 'land',  capacity: 0,  ammoMax: 20 },
  // Infantry types
  infantry:  { name: 'Мотострелки',   icon: '👥',  hp: 60,  power: 12, speed: 0.3, cost: 2000,  domain: 'land',  capacity: 0,  ammoMax: 80 },
  airborne:  { name: 'Десантники',    icon: '🪂',  hp: 55,  power: 14, speed: 0.4, cost: 3000,  domain: 'land',  capacity: 0,  ammoMax: 70 },
  marine:    { name: 'Морпехи',       icon: '⚓',  hp: 65,  power: 15, speed: 0.35,cost: 3500,  domain: 'land',  capacity: 0,  ammoMax: 75 },
  specops:   { name: 'Спецназ',       icon: '🥷',  hp: 50,  power: 20, speed: 0.6, cost: 8000,  domain: 'land',  capacity: 0,  ammoMax: 50 },
  sniper:    { name: 'Снайперы',      icon: '🎯',  hp: 30,  power: 28, speed: 0.3, cost: 5000,  domain: 'land',  capacity: 0,  ammoMax: 30 },
  engineer:  { name: 'Сапёры',        icon: '🔧',  hp: 55,  power: 8,  speed: 0.3, cost: 2500,  domain: 'land',  capacity: 0,  ammoMax: 40 },
  apc:       { name: 'БТР',           icon: '🚛',  hp: 100, power: 15, speed: 0.8, cost: 4000,  domain: 'land',  capacity: 2,  ammoMax: 50 },
  // Naval
  ship:      { name: 'Корабль',       icon: '🚢',  hp: 200, power: 35, speed: 1,   cost: 15000, domain: 'sea',   capacity: 1,  ammoMax: 60 },
  submarine: { name: 'Подлодка',      icon: '🐟',  hp: 120, power: 30, speed: 0.8, cost: 12000, domain: 'sea',   capacity: 0,  ammoMax: 30 },
  carrier:   { name: 'Авианосец',     icon: '🛳️', hp: 300, power: 10, speed: 0.6, cost: 80000, domain: 'sea',   capacity: 6,  ammoMax: 20 },
  cruiser:   { name: 'Крейсер',       icon: '⚓',  hp: 250, power: 40, speed: 0.8, cost: 40000, domain: 'sea',   capacity: 2,  ammoMax: 50 },
  destroyer: { name: 'Эсминец',       icon: '🚢',  hp: 180, power: 35, speed: 1.2, cost: 25000, domain: 'sea',   capacity: 1,  ammoMax: 45 },
};

export default class GameState {
  constructor() {
    this.phase = 'loading';
    this.players = [];
    this.humanPlayer = null;
    this.units = [];
    this.buildings = [];
    this.events = [];
    this.gameTime = 0;
    this.stocks = [];
    this.predictions = [];
  }

  init(numAI = 5) {
    this.humanPlayer = new Player({ name: 'Игрок', colorIndex: 0, isHuman: true });
    this.players = [this.humanPlayer];

    const aiNames = ['Альфа', 'Браво', 'Дельта', 'Эхо', 'Фокстрот'];
    for (let i = 0; i < numAI; i++) {
      this.players.push(new Player({ name: aiNames[i], colorIndex: i + 1, isHuman: false }));
    }

    this._initStocks();
    this._initPredictions();
    this.phase = 'setup';
    this.addEvent('🎮 Кликните на карту, чтобы разместить штаб!');
  }

  // ═══════════ STOCKS — driven by gameplay ═══════════

  _initStocks() {
    this.stocks = [
      { id: 'OIL',  name: 'Нефть',       icon: '🛢️', price: 75,   history: [75],   basePrice: 75,   driver: 'buildings' },
      { id: 'GOLD', name: 'Золото',       icon: '🥇', price: 1800, history: [1800], basePrice: 1800, driver: 'wars' },
      { id: 'STEEL',name: 'Сталь',        icon: '⚙️', price: 420,  history: [420],  basePrice: 420,  driver: 'units' },
      { id: 'FOOD', name: 'Зерно',        icon: '🌾', price: 210,  history: [210],  basePrice: 210,  driver: 'territory' },
      { id: 'ARMS', name: 'Вооружения',   icon: '🔫', price: 1000, history: [1000], basePrice: 1000, driver: 'power' },
    ];
  }

  /** Tick stocks — prices driven by gameplay factors */
  tickStocks(gameMetrics) {
    const m = gameMetrics || {};
    for (const stock of this.stocks) {
      let drift = 0;
      if (stock.driver === 'buildings') drift = (m.totalBuildings || 10) * 0.003 - 0.02;
      else if (stock.driver === 'wars') drift = (m.recentAttacks || 0) * 0.01;
      else if (stock.driver === 'units') drift = (m.totalUnits || 10) * 0.002 - 0.015;
      else if (stock.driver === 'territory') drift = -(m.totalTerritory || 1000) * 0.00001;
      else if (stock.driver === 'power') drift = (m.totalPower || 100) * 0.0003;

      const vol = STOCK.TICK_VOLATILITY;
      const change = stock.price * ((Math.random() - 0.48) * vol + drift);
      stock.price = Math.max(1, stock.price + change);
      stock.history.push(Math.round(stock.price * 100) / 100);
      if (stock.history.length > STOCK.MAX_HISTORY_LENGTH) stock.history.shift();
    }
  }

  // ═══════════ PREDICTIONS ═══════════

  _initPredictions() {
    this.predictions = [
      { id: 'pred_1', question: 'Нефть превысит $100 за 5 минут?', oddsYes: 0.4, oddsNo: 0.6, pool: 0, bets: [], resolved: false, checkFn: (s) => s.stocks.find(x => x.id === 'OIL')?.price > 100, deadline: 300 },
      { id: 'pred_2', question: 'Игрок захватит 20,000 км² за 10 мин?', oddsYes: 0.35, oddsNo: 0.65, pool: 0, bets: [], resolved: false, checkFn: null, deadline: 600 },
      { id: 'pred_3', question: 'Будет уничтожен хотя бы 1 штаб?', oddsYes: 0.2, oddsNo: 0.8, pool: 0, bets: [], resolved: false, checkFn: null, deadline: 600 },
    ];
  }

  placeBet(predId, side, amount, playerId) {
    const pred = this.predictions.find(p => p.id === predId);
    if (!pred || pred.resolved) return false;
    const player = this.getPlayer(playerId);
    if (!player || !player.canAfford(amount)) return false;
    player.spend(amount);
    pred.pool += amount;
    pred.bets.push({ playerId, side, amount });
    return true;
  }

  // ═══════════ BUILDINGS ═══════════

  addBuilding(player, type, lat, lng) {
    const def = BUILDING_DEFS[type];
    if (!def) return null;
    const extra = {};
    if (type === 'warehouse') { extra.ammo = 0; extra.ammoMax = 500; extra.productionRate = 2; }
    if (type === 'repair') { extra.repairRate = 5; }

    const building = {
      id: uid('bld'), type, name: def.name, icon: def.icon,
      radiusKm: def.radiusKm, lat, lng,
      ownerId: player.id, colorIndex: player.colorIndex,
      hp: 200, maxHp: 200, ...extra,
    };
    this.buildings.push(building);
    player.buildings.push(building);
    return building;
  }

  getBuildingRadius(type) { return BUILDING_DEFS[type]?.radiusKm || 10; }
  getBuildingCost(type) { return BUILDING_DEFS[type]?.cost || 1000; }

  // ═══════════ UNITS ═══════════

  addUnit(player, type, lat, lng) {
    const def = UNIT_DEFS[type];
    if (!def) return null;
    const unit = {
      id: uid('unit'), type, name: `${def.name}-${randInt(1, 99)}`,
      icon: def.icon, lat, lng,
      ownerId: player.id, colorIndex: player.colorIndex,
      hp: def.hp, maxHp: def.hp, power: def.power, speed: def.speed,
      domain: def.domain, status: 'idle', selected: false,
      targetLat: null, targetLng: null,
      ammo: def.ammoMax, ammoMax: def.ammoMax,
      cargo: [], capacity: def.capacity,
      squadronId: null,
    };
    this.units.push(unit);
    player.units.push(unit);
    return unit;
  }

  getUnitDef(type) { return UNIT_DEFS[type]; }

  removeUnit(unit) {
    this.units = this.units.filter(u => u.id !== unit.id);
    for (const p of this.players) p.units = p.units.filter(u => u.id !== unit.id);
  }

  findUnitAt(lat, lng, radius = 0.02) {
    let closest = null, closestDist = Infinity;
    for (const u of this.units) {
      const d = Math.sqrt((u.lat - lat) ** 2 + (u.lng - lng) ** 2);
      if (d < radius && d < closestDist) { closest = u; closestDist = d; }
    }
    return closest;
  }

  getSelectedUnit() { return this.units.find(u => u.selected); }
  getSelectedUnits() { return this.units.filter(u => u.selected); }
  deselectAll() { for (const u of this.units) u.selected = false; }

  // ═══════════ CARGO ═══════════

  loadCargo(transport, infantryUnit) {
    if (transport.cargo.length >= transport.capacity) return false;
    if (!['infantry','airborne','marine','specops','sniper','engineer'].includes(infantryUnit.type)) return false;
    transport.cargo.push(infantryUnit);
    infantryUnit.status = 'loaded';
    infantryUnit.lat = -999; infantryUnit.lng = -999; // off-map
    return true;
  }

  unloadCargo(transport) {
    for (const u of transport.cargo) {
      u.lat = transport.lat + (Math.random() - 0.5) * 0.02;
      u.lng = transport.lng + (Math.random() - 0.5) * 0.02;
      u.status = 'idle';
    }
    const unloaded = transport.cargo.length;
    transport.cargo = [];
    return unloaded;
  }

  // ═══════════ HELPERS ═══════════

  getPlayer(id) { return this.players.find(p => p.id === id); }

  addEvent(text, type = 'info') {
    this.events.unshift({ text, type, time: this.gameTime });
    if (this.events.length > 100) this.events.length = 100;
  }
}
