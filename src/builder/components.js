/* ═══════════════════════════════════════════════════════════
   AEROWAR — Aircraft & AA Components Catalog
   Each component affects the final vehicle's stats
   ═══════════════════════════════════════════════════════════ */

// ──────────── AIRCRAFT COMPONENTS ────────────

export const FUSELAGES = [
  {
    id: 'fus_light', name: 'Лёгкий', icon: '🪶',
    desc: 'Минимальный вес, 4 слота',
    cost: 2000, slots: 4, weight: 500,
    stats: { speed: 15, armor: 5, maneuverability: 20, stealth: 10 },
  },
  {
    id: 'fus_medium', name: 'Средний', icon: '📦',
    desc: 'Баланс веса и прочности, 6 слотов',
    cost: 4000, slots: 6, weight: 1200,
    stats: { speed: 10, armor: 15, maneuverability: 10, stealth: 5 },
  },
  {
    id: 'fus_heavy', name: 'Тяжёлый', icon: '🏋️',
    desc: 'Максимальная прочность, 8 слотов',
    cost: 7000, slots: 8, weight: 2500,
    stats: { speed: 5, armor: 30, maneuverability: 5, stealth: 0 },
  },
  {
    id: 'fus_stealth', name: 'Стелс', icon: '👻',
    desc: 'Углоукрывающая форма, 5 слотов',
    cost: 12000, slots: 5, weight: 1500,
    stats: { speed: 12, armor: 10, maneuverability: 12, stealth: 35 },
  },
];

export const ENGINES = [
  {
    id: 'eng_piston', name: 'Поршневой', icon: '⚙️',
    desc: 'Дешёвый, экономичный, медленный',
    cost: 1500, weight: 300,
    stats: { speed: 10, fuelEfficiency: 25, range: 15 },
    type: 'propeller',
  },
  {
    id: 'eng_turboprop', name: 'Турбовинтовой', icon: '🌀',
    desc: 'Средняя скорость, хорошая экономичность',
    cost: 3500, weight: 500,
    stats: { speed: 20, fuelEfficiency: 18, range: 20 },
    type: 'propeller',
  },
  {
    id: 'eng_jet', name: 'Реактивный', icon: '🔥',
    desc: 'Высокая скорость, большой расход',
    cost: 8000, weight: 800,
    stats: { speed: 35, fuelEfficiency: 8, range: 25 },
    type: 'jet',
  },
  {
    id: 'eng_turboshaft', name: 'Турбовальный', icon: '🚁',
    desc: 'Для вертолётов. Подъёмная сила',
    cost: 5000, weight: 400,
    stats: { speed: 12, fuelEfficiency: 12, range: 10, maneuverability: 15 },
    type: 'helicopter',
  },
  {
    id: 'eng_afterburner', name: 'С форсажем', icon: '💥',
    desc: 'Максимальная тяга, огромный расход',
    cost: 14000, weight: 1100,
    stats: { speed: 45, fuelEfficiency: 3, range: 18 },
    type: 'jet',
  },
];

export const WINGS = [
  {
    id: 'wing_straight', name: 'Прямые', icon: '➖',
    desc: 'Стабильность, хороший подъём',
    cost: 1000, weight: 200,
    stats: { maneuverability: 10, speed: 5, fuelEfficiency: 8 },
    style: 'fixed',
  },
  {
    id: 'wing_swept', name: 'Стреловидные', icon: '✦',
    desc: 'Для истребителей. Высокая скорость',
    cost: 3000, weight: 250,
    stats: { maneuverability: 18, speed: 15, fuelEfficiency: 5 },
    style: 'fixed',
  },
  {
    id: 'wing_delta', name: 'Дельта', icon: '△',
    desc: 'Сверхзвуковые полёты',
    cost: 5000, weight: 280,
    stats: { maneuverability: 12, speed: 25, fuelEfficiency: 6 },
    style: 'fixed',
  },
  {
    id: 'wing_rotor', name: 'Несущий винт', icon: '🌀',
    desc: 'Вертолётный. Вертикальный взлёт',
    cost: 4000, weight: 350,
    stats: { maneuverability: 25, speed: -5, fuelEfficiency: 4 },
    style: 'rotor',
  },
  {
    id: 'wing_variable', name: 'Изменяемая геометрия', icon: '↔️',
    desc: 'Универсальные, дорогие',
    cost: 9000, weight: 400,
    stats: { maneuverability: 20, speed: 18, fuelEfficiency: 7 },
    style: 'fixed',
  },
];

export const WEAPONS = [
  {
    id: 'wpn_machinegun', name: 'Пулемёты', icon: '🔫',
    desc: 'Лёгкие, ближний бой',
    cost: 800, weight: 80, slotCost: 1,
    stats: { damage: 10 },
  },
  {
    id: 'wpn_cannon', name: 'Авиапушки', icon: '💣',
    desc: 'Тяжёлый огонь, средняя дальность',
    cost: 2000, weight: 200, slotCost: 1,
    stats: { damage: 20 },
  },
  {
    id: 'wpn_aam', name: 'Ракеты "воздух-воздух"', icon: '🚀',
    desc: 'Для воздушного боя',
    cost: 5000, weight: 300, slotCost: 2,
    stats: { damage: 30, range: 10 },
  },
  {
    id: 'wpn_agm', name: 'Ракеты "воздух-земля"', icon: '🎯',
    desc: 'Для ударов по наземным целям',
    cost: 6000, weight: 400, slotCost: 2,
    stats: { damage: 35, range: 8 },
  },
  {
    id: 'wpn_bombs', name: 'Бомбы', icon: '💥',
    desc: 'Фугасные бомбы, максимальный наземный урон',
    cost: 3000, weight: 600, slotCost: 2,
    stats: { damage: 45, speed: -5 },
  },
  {
    id: 'wpn_cruise', name: 'Крылатые ракеты', icon: '🛩️',
    desc: 'Дальнобойные, высокоточные',
    cost: 15000, weight: 500, slotCost: 3,
    stats: { damage: 50, range: 25 },
  },
];

export const ARMOR_OPTIONS = [
  {
    id: 'arm_none', name: 'Без брони', icon: '—',
    desc: 'Максимальная скорость',
    cost: 0, weight: 0,
    stats: { armor: 0 },
  },
  {
    id: 'arm_light', name: 'Лёгкая', icon: '🛡️',
    desc: 'Базовая защита',
    cost: 1500, weight: 200,
    stats: { armor: 12, speed: -3 },
  },
  {
    id: 'arm_heavy', name: 'Тяжёлая', icon: '🏗️',
    desc: 'Серьёзная защита, большой вес',
    cost: 4000, weight: 600,
    stats: { armor: 28, speed: -8, maneuverability: -5 },
  },
  {
    id: 'arm_composite', name: 'Композитная', icon: '🔬',
    desc: 'Высокая защита, малый вес. Дорого',
    cost: 10000, weight: 250,
    stats: { armor: 22, speed: -2 },
  },
];

export const ELECTRONICS = [
  {
    id: 'el_basic', name: 'Базовая авионика', icon: '📡',
    desc: 'Минимальный набор',
    cost: 500, weight: 50,
    stats: { detection: 5 },
  },
  {
    id: 'el_advanced', name: 'Продвинутый радар', icon: '📡',
    desc: 'Хорошее обнаружение',
    cost: 3000, weight: 100,
    stats: { detection: 18 },
  },
  {
    id: 'el_awacs', name: 'АВАКС', icon: '🛸',
    desc: 'Дальнее обнаружение для всей группы',
    cost: 20000, weight: 500, slotCost: 3,
    stats: { detection: 40, speed: -10 },
  },
  {
    id: 'el_ecm', name: 'РЭБ', icon: '⚡',
    desc: 'Радиоэлектронная борьба. Снижает точность ПВО',
    cost: 8000, weight: 200, slotCost: 2,
    stats: { detection: 10, stealth: 15 },
  },
];

export const SPECIALS = [
  {
    id: 'spec_extratank', name: 'Доп. топливный бак', icon: '⛽',
    desc: '+50% дальности',
    cost: 1000, weight: 200, slotCost: 1,
    stats: { range: 20, fuelEfficiency: 10, speed: -3 },
  },
  {
    id: 'spec_flares', name: 'Тепловые ловушки', icon: '✨',
    desc: 'Защита от ракет с ИК',
    cost: 2000, weight: 30, slotCost: 1,
    stats: { stealth: 8 },
  },
  {
    id: 'spec_stealth_coat', name: 'Стелс-покрытие', icon: '🌑',
    desc: 'Радиопоглощающее покрытие',
    cost: 15000, weight: 100, slotCost: 1,
    stats: { stealth: 20, speed: -2 },
  },
];

// ──────────── COMPONENT CATEGORIES (for builder UI) ────────────

export const AIRCRAFT_CATEGORIES = [
  { id: 'fuselage', name: 'Фюзеляж', icon: '🛩️', items: FUSELAGES, required: true, max: 1 },
  { id: 'engine', name: 'Двигатель', icon: '🔥', items: ENGINES, required: true, max: 1 },
  { id: 'wings', name: 'Крылья', icon: '✈️', items: WINGS, required: true, max: 1 },
  { id: 'weapons', name: 'Вооружение', icon: '🚀', items: WEAPONS, required: false, max: 3 },
  { id: 'armor', name: 'Броня', icon: '🛡️', items: ARMOR_OPTIONS, required: true, max: 1 },
  { id: 'electronics', name: 'Электроника', icon: '📡', items: ELECTRONICS, required: true, max: 1 },
  { id: 'special', name: 'Спецоборудование', icon: '⚡', items: SPECIALS, required: false, max: 2 },
];

// ──────────── AA (ПВО) COMPONENTS ────────────

export const AA_CHASSIS = [
  {
    id: 'aa_static', name: 'Стационарный', icon: '🏗️',
    desc: 'Неподвижный, дешёвый, прочный',
    cost: 2000, weight: 0,
    stats: { armor: 20 },
    mobile: false,
  },
  {
    id: 'aa_wheeled', name: 'Колёсный', icon: '🚚',
    desc: 'Мобильный, быстрое развёртывание',
    cost: 5000, weight: 0,
    stats: { armor: 8, speed: 15 },
    mobile: true,
  },
  {
    id: 'aa_tracked', name: 'Гусеничный', icon: '🛡️',
    desc: 'Бронированный, подвижный',
    cost: 9000, weight: 0,
    stats: { armor: 18, speed: 8 },
    mobile: true,
  },
];

export const AA_RADARS = [
  {
    id: 'aar_short', name: 'Ближний радар', icon: '📡',
    desc: 'Обнаружение до 20 км',
    cost: 2000, weight: 100,
    stats: { detection: 15, range: 10 },
  },
  {
    id: 'aar_medium', name: 'Средний радар', icon: '📡',
    desc: 'Обнаружение до 80 км',
    cost: 6000, weight: 200,
    stats: { detection: 30, range: 20 },
  },
  {
    id: 'aar_long', name: 'Дальний радар', icon: '📡',
    desc: 'Обнаружение до 300 км',
    cost: 15000, weight: 400,
    stats: { detection: 45, range: 35 },
  },
  {
    id: 'aar_phased', name: 'Фазированная решётка', icon: '🛸',
    desc: 'Макс. обнаружение, помехозащищённость',
    cost: 30000, weight: 600,
    stats: { detection: 60, range: 45 },
  },
];

export const AA_MISSILES = [
  {
    id: 'aam_short', name: 'Ракеты малой дальности', icon: '🚀',
    desc: 'Быстрые, точные, ближний бой',
    cost: 3000, weight: 150,
    stats: { damage: 25, range: 8 },
  },
  {
    id: 'aam_medium', name: 'Ракеты средней дальности', icon: '🚀',
    desc: 'Баланс дальности и урона',
    cost: 8000, weight: 250,
    stats: { damage: 35, range: 20 },
  },
  {
    id: 'aam_long', name: 'Ракеты большой дальности', icon: '🚀',
    desc: 'Далеко стреляет, дорого',
    cost: 18000, weight: 400,
    stats: { damage: 45, range: 40 },
  },
];

export const AA_GUNS = [
  {
    id: 'aag_none', name: 'Без пушки', icon: '—',
    desc: 'Только ракеты',
    cost: 0, weight: 0,
    stats: {},
  },
  {
    id: 'aag_auto', name: 'Зенитный автомат', icon: '🔫',
    desc: 'Скорострельная пушка ближнего боя',
    cost: 3000, weight: 300,
    stats: { damage: 15 },
  },
  {
    id: 'aag_gatling', name: 'Скорострельная (Гатлинг)', icon: '💥',
    desc: 'Шквал огня на ближней дистанции',
    cost: 8000, weight: 500,
    stats: { damage: 28 },
  },
];

export const AA_CATEGORIES = [
  { id: 'chassis', name: 'Шасси', icon: '🚛', items: AA_CHASSIS, required: true, max: 1 },
  { id: 'radar', name: 'Радар', icon: '📡', items: AA_RADARS, required: true, max: 1 },
  { id: 'missiles', name: 'Ракеты', icon: '🚀', items: AA_MISSILES, required: true, max: 1 },
  { id: 'guns', name: 'Пушки', icon: '🔫', items: AA_GUNS, required: false, max: 1 },
];

// ──────────── NAVAL COMPONENTS ────────────

export const NAVAL_HULLS = [
  { id: 'nh_patrol', name: 'Патрульный катер', icon: '🚤', desc: 'Быстрый, лёгкий', cost: 3000, stats: { speed: 25, armor: 5 }, capacity: 0 },
  { id: 'nh_corvette', name: 'Корвет', icon: '🚢', desc: 'Лёгкий боевой корабль', cost: 8000, stats: { speed: 18, armor: 15 }, capacity: 0 },
  { id: 'nh_frigate', name: 'Фрегат', icon: '🚢', desc: 'Универсальный', cost: 15000, stats: { speed: 14, armor: 22 }, capacity: 1 },
  { id: 'nh_destroyer', name: 'Эсминец', icon: '🚢', desc: 'Мощное вооружение', cost: 25000, stats: { speed: 16, armor: 28 }, capacity: 1 },
  { id: 'nh_cruiser', name: 'Крейсер', icon: '⚓', desc: 'Тяжёлый, многоцелевой', cost: 40000, stats: { speed: 10, armor: 35 }, capacity: 2 },
  { id: 'nh_carrier', name: 'Авианосец', icon: '🛳️', desc: 'Несёт авиагруппу', cost: 80000, stats: { speed: 8, armor: 40 }, capacity: 6 },
  { id: 'nh_submarine', name: 'Подводная лодка', icon: '🐟', desc: 'Скрытность, торпеды', cost: 30000, stats: { speed: 12, armor: 18, stealth: 30 }, capacity: 0 },
];

export const NAVAL_ENGINES = [
  { id: 'ne_diesel', name: 'Дизельный', icon: '⚙️', desc: 'Экономичный', cost: 2000, stats: { speed: 8, fuelEfficiency: 20 } },
  { id: 'ne_gasturbine', name: 'Газотурбинный', icon: '🔥', desc: 'Высокая скорость', cost: 8000, stats: { speed: 18, fuelEfficiency: 8 } },
  { id: 'ne_nuclear', name: 'Ядерный', icon: '☢️', desc: 'Неограниченная дальность', cost: 50000, stats: { speed: 15, fuelEfficiency: 50, range: 50 } },
];

export const NAVAL_WEAPONS = [
  { id: 'nw_gun', name: 'Артиллерия', icon: '💣', desc: 'Пушки, ближний бой', cost: 3000, stats: { damage: 20 } },
  { id: 'nw_missile', name: 'Крылатые ракеты', icon: '🚀', desc: 'Дальнобойные', cost: 12000, stats: { damage: 40, range: 30 } },
  { id: 'nw_torpedo', name: 'Торпеды', icon: '💥', desc: 'Противокорабельные', cost: 8000, stats: { damage: 45 } },
  { id: 'nw_sam', name: 'Корабельные ЗРК', icon: '🎯', desc: 'ПВО корабля', cost: 15000, stats: { damage: 25, detection: 20 } },
  { id: 'nw_ciws', name: 'CIWS (Фаланкс)', icon: '🔫', desc: 'Ближняя ПВО', cost: 6000, stats: { damage: 15, detection: 10 } },
];

export const NAVAL_CATEGORIES = [
  { id: 'hull', name: 'Корпус', icon: '🚢', items: NAVAL_HULLS, required: true, max: 1 },
  { id: 'engine', name: 'Двигатель', icon: '🔥', items: NAVAL_ENGINES, required: true, max: 1 },
  { id: 'weapons', name: 'Вооружение', icon: '🚀', items: NAVAL_WEAPONS, required: false, max: 3 },
];

// ──────────── INFANTRY COMPONENTS ────────────

export const INFANTRY_SQUADS = [
  { id: 'inf_rifle', name: 'Мотострелки', icon: '👥', desc: 'Универсальный отряд', cost: 1500, stats: { armor: 5, speed: 4 }, size: 10 },
  { id: 'inf_airborne', name: 'Десантники', icon: '🪂', desc: 'Десантирование с воздуха', cost: 3000, stats: { armor: 8, speed: 5 }, size: 8 },
  { id: 'inf_marine', name: 'Морпехи', icon: '⚓', desc: 'Морские десантные', cost: 3500, stats: { armor: 10, speed: 4 }, size: 8 },
  { id: 'inf_specops', name: 'Спецназ', icon: '🥷', desc: 'Малая группа, макс. навыки', cost: 8000, stats: { armor: 6, speed: 8, stealth: 25 }, size: 4 },
  { id: 'inf_sniper', name: 'Снайперы', icon: '🎯', desc: 'Дальний огонь, малая группа', cost: 5000, stats: { armor: 3, speed: 5, stealth: 15 }, size: 2 },
  { id: 'inf_engineer', name: 'Сапёры', icon: '🔧', desc: 'Мины, укрепления, разминирование', cost: 2500, stats: { armor: 6, speed: 3 }, size: 6 },
];

export const INFANTRY_WEAPONS = [
  { id: 'iw_rifle', name: 'Штурмовые винтовки', icon: '🔫', desc: 'Стандарт', cost: 500, stats: { damage: 10 } },
  { id: 'iw_mg', name: 'Пулемёт', icon: '💥', desc: 'Подавление', cost: 1200, stats: { damage: 18, speed: -1 } },
  { id: 'iw_rpg', name: 'РПГ', icon: '🚀', desc: 'Против техники', cost: 2000, stats: { damage: 30 } },
  { id: 'iw_atgm', name: 'ПТРК', icon: '🎯', desc: 'Управляемые ракеты', cost: 5000, stats: { damage: 40, range: 8 } },
  { id: 'iw_manpad', name: 'ПЗРК', icon: '🚀', desc: 'Против авиации', cost: 4000, stats: { damage: 35 } },
  { id: 'iw_mortar', name: 'Миномёт', icon: '💣', desc: 'Навесной огонь', cost: 3000, stats: { damage: 25, range: 5 } },
  { id: 'iw_sniper', name: 'Снайперская винтовка', icon: '🎯', desc: 'Дальний, точный', cost: 3500, stats: { damage: 28, range: 10 } },
  { id: 'iw_smg', name: 'ПП', icon: '🔫', desc: 'Ближний бой', cost: 400, stats: { damage: 8, speed: 1 } },
];

export const INFANTRY_ARMOR = [
  { id: 'ia_none', name: 'Без брони', icon: '—', desc: 'Макс. скорость', cost: 0, stats: { armor: 0 } },
  { id: 'ia_light', name: 'Лёгкий бронежилет', icon: '🛡️', desc: 'Базовая', cost: 300, stats: { armor: 8, speed: -1 } },
  { id: 'ia_heavy', name: 'Тяжёлый бронежилет', icon: '🏗️', desc: 'Полная защита', cost: 1000, stats: { armor: 20, speed: -3 } },
  { id: 'ia_exo', name: 'Экзоскелет', icon: '🤖', desc: 'Сила + защита', cost: 8000, stats: { armor: 15, speed: 2, damage: 5 } },
];

export const INFANTRY_TRANSPORT = [
  { id: 'it_foot', name: 'Пешком', icon: '🚶', desc: 'Без транспорта', cost: 0, stats: { speed: 3 } },
  { id: 'it_truck', name: 'Грузовик', icon: '🚛', desc: 'Быстрая переброска', cost: 1500, stats: { speed: 15 } },
  { id: 'it_apc', name: 'БТР', icon: '🚜', desc: 'Бронированный транспорт', cost: 4000, stats: { speed: 12, armor: 15 } },
  { id: 'it_ifv', name: 'БМП', icon: '🛡️', desc: 'Вооружённый транспорт', cost: 6000, stats: { speed: 10, armor: 20, damage: 12 } },
];

export const INFANTRY_CATEGORIES = [
  { id: 'squad', name: 'Тип отряда', icon: '👥', items: INFANTRY_SQUADS, required: true, max: 1 },
  { id: 'weapons', name: 'Оружие', icon: '🔫', items: INFANTRY_WEAPONS, required: true, max: 2 },
  { id: 'armor', name: 'Броня', icon: '🛡️', items: INFANTRY_ARMOR, required: true, max: 1 },
  { id: 'transport', name: 'Транспорт', icon: '🚛', items: INFANTRY_TRANSPORT, required: true, max: 1 },
];

// ──────────── Vehicle type detection ────────────

export function determineAircraftType(components) {
  const wings = components.wings;
  const engine = components.engine;
  const weapons = components.weapons || [];
  const fuselage = components.fuselage;
  const electronics = components.electronics;

  if (wings?.style === 'rotor' || engine?.type === 'helicopter') return { type: 'helicopter', label: 'Вертолёт', icon: '🚁' };
  if (electronics?.id === 'el_awacs') return { type: 'awacs', label: 'Самолёт ДРЛО', icon: '🛸' };
  if (fuselage?.id === 'fus_heavy' && weapons.some(w => w?.id === 'wpn_bombs')) return { type: 'bomber', label: 'Бомбардировщик', icon: '💣' };
  if (engine?.type === 'jet' && weapons.some(w => w?.id === 'wpn_aam')) return { type: 'fighter', label: 'Истребитель', icon: '✈️' };
  if (weapons.some(w => w?.id === 'wpn_agm') || weapons.some(w => w?.id === 'wpn_bombs')) return { type: 'attacker', label: 'Штурмовик', icon: '🛩️' };
  return { type: 'aircraft', label: 'Самолёт', icon: '🛩️' };
}

export function determineShipType(components) {
  const hull = components.hull;
  if (hull?.id === 'nh_carrier') return { type: 'carrier', label: 'Авианосец', icon: '🛳️' };
  if (hull?.id === 'nh_submarine') return { type: 'submarine', label: 'Подлодка', icon: '🐟' };
  if (hull?.id === 'nh_cruiser') return { type: 'cruiser', label: 'Крейсер', icon: '⚓' };
  if (hull?.id === 'nh_destroyer') return { type: 'destroyer', label: 'Эсминец', icon: '🚢' };
  return { type: 'ship', label: 'Корабль', icon: '🚢' };
}

export function determineInfantryType(components) {
  const squad = components.squad;
  if (squad?.id === 'inf_specops') return { type: 'specops', label: 'Спецназ', icon: '🥷' };
  if (squad?.id === 'inf_sniper') return { type: 'sniper', label: 'Снайперы', icon: '🎯' };
  if (squad?.id === 'inf_airborne') return { type: 'airborne', label: 'Десантники', icon: '🪂' };
  if (squad?.id === 'inf_marine') return { type: 'marine', label: 'Морпехи', icon: '⚓' };
  if (squad?.id === 'inf_engineer') return { type: 'engineer', label: 'Сапёры', icon: '🔧' };
  return { type: 'infantry', label: 'Мотострелки', icon: '👥' };
}
