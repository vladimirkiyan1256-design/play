/* ═══════════════════════════════════════════════════════════
   AEROWAR — Game Constants & Balance Config
   ═══════════════════════════════════════════════════════════ */

/** Player faction color palette */
export const FACTION_COLORS = [
  '#00e5ff', // Cyan
  '#ff1744', // Red
  '#00e676', // Green
  '#ff6d00', // Orange
  '#d500f9', // Purple
  '#ffea00', // Yellow
  '#2979ff', // Blue
  '#ff9100', // Amber
];

export const NEUTRAL_COLOR = '#2a3444';
export const NEUTRAL_FILL = 'rgba(42, 52, 68, 0.6)';
export const OCEAN_COLOR = '#070b14';
export const BORDER_COLOR = 'rgba(255,255,255,0.12)';
export const HOVER_FILL = 'rgba(0, 229, 255, 0.15)';

/** Map projection */
export const MAP = {
  /** Mercator projection bounds (longitude/latitude) */
  MIN_LON: -180,
  MAX_LON: 180,
  MIN_LAT: -60,
  MAX_LAT: 84,
  /** Zoom limits */
  MIN_ZOOM: 0.8,
  MAX_ZOOM: 12,
  ZOOM_SPEED: 0.001,
  DEFAULT_ZOOM: 1.5,
};

/** Game speed (ms per tick) */
export const TICK_SPEEDS = [2000, 1000, 500, 250];
export const SPEED_LABELS = ['x1', 'x2', 'x4', 'x8'];

/** Economy base rates */
export const ECONOMY = {
  BASE_INCOME_PER_TERRITORY: 200,
  POP_INCOME_MULT: 0.5,
  OIL_INCOME_MULT: 1.8,
  GOLD_INCOME_MULT: 1.5,
  ORE_INCOME_MULT: 1.2,
  ARMY_UPKEEP_PER_UNIT: 50,
  AA_UPKEEP_PER_UNIT: 35,
  START_MONEY: 50000,
};

/** Resources that territories can have */
export const RESOURCE_TYPES = [
  { id: 'oil', name: 'Нефть', icon: '🛢️', color: '#1a1a1a' },
  { id: 'gold', name: 'Золото', icon: '🥇', color: '#ffd700' },
  { id: 'ore', name: 'Руда', icon: '⛏️', color: '#8b7355' },
  { id: 'food', name: 'Продовольствие', icon: '🌾', color: '#7cfc00' },
];

/** Vehicle (aircraft) component stats keys */
export const STAT_KEYS = [
  'speed', 'range', 'damage', 'armor',
  'maneuverability', 'stealth', 'detection', 'fuelEfficiency',
];

export const STAT_LABELS = {
  speed: 'Скорость',
  range: 'Дальность',
  damage: 'Урон',
  armor: 'Броня',
  maneuverability: 'Манёвренность',
  stealth: 'Стелс',
  detection: 'Обнаружение',
  fuelEfficiency: 'Экономичность',
};

/** Maximum stat value (for bars display) */
export const MAX_STAT = 100;

/** AI difficulty settings */
export const AI_CONFIGS = {
  easy: { aggressiveness: 0.3, builderSkill: 0.4, tradingSkill: 0.2 },
  medium: { aggressiveness: 0.5, builderSkill: 0.6, tradingSkill: 0.5 },
  hard: { aggressiveness: 0.7, builderSkill: 0.9, tradingSkill: 0.8 },
};

/** Stock exchange */
export const STOCK = {
  TICK_VOLATILITY: 0.02,
  EVENT_IMPACT: 0.1,
  MAX_HISTORY_LENGTH: 200,
};

/** Prediction market */
export const PREDICTION = {
  MIN_ODDS: 0.02,
  MAX_ODDS: 0.98,
  MIN_BET: 100,
  RESOLUTION_TURNS: { min: 5, max: 20 },
};
