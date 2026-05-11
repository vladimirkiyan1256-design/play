/* ═══════════════════════════════════════════════════════════
   AEROWAR v2.1 — UI Manager (Full Builder, Squadrons, Cargo)
   ═══════════════════════════════════════════════════════════ */

import { STAT_KEYS, STAT_LABELS, MAX_STAT } from '../utils/constants.js';
import { formatMoney } from '../utils/math.js';
import {
  AIRCRAFT_CATEGORIES, AA_CATEGORIES,
  NAVAL_CATEGORIES, INFANTRY_CATEGORIES,
  determineAircraftType, determineShipType, determineInfantryType,
} from '../builder/components.js';

export default class UIManager {
  constructor(state, builder, engine) {
    this.state = state;
    this.builder = builder;
    this.engine = engine;

    // Panel elements
    this.panelTitle = document.getElementById('panel-title');
    this.panelContent = document.getElementById('panel-content');

    // Navigation buttons
    this._bindNav();

    // Init
    this.updateHUD();
    this.updateEvents();
  }

  _bindNav() {
    const panel = document.getElementById('main-panel');
    const closeBtn = document.getElementById('panel-close-btn');
    this._activeNavId = null;

    const btns = {
      'nav-army': () => this._showArmyPanel(),
      'nav-builder': () => this._showBuilderTabs(),
      'nav-bases': () => this._showBasesPanel(),
      'nav-stocks': () => this._showStocksPanel(),
      'nav-diplo': () => this._showPredictionsPanel(),
    };

    for (const [id, fn] of Object.entries(btns)) {
      document.getElementById(id)?.addEventListener('click', () => {
        // Toggle: if same button clicked again, close panel
        if (this._activeNavId === id && panel && !panel.classList.contains('panel-hidden')) {
          panel.classList.add('panel-hidden');
          document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
          this._activeNavId = null;
          return;
        }

        // Activate this button, show panel
        document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
        panel?.classList.remove('panel-hidden');
        this._activeNavId = id;
        fn();
      });
    }

    // Close button
    closeBtn?.addEventListener('click', () => {
      panel?.classList.add('panel-hidden');
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      this._activeNavId = null;
    });
  }

  // ═══════════ HUD ═══════════

  updateHUD() {
    const p = this.state.humanPlayer;
    if (!p) return;
    const el = (id) => document.getElementById(id);
    el('hud-money-value').textContent = formatMoney(p.money);
    el('hud-air-value').textContent = p.units.filter(u => u.domain === 'air').length;
    el('hud-ground-value').textContent = p.units.filter(u => u.domain === 'land').length;
    el('hud-sea-value').textContent = p.units.filter(u => u.domain === 'sea').length;
  }

  updateEvents() {
    const ticker = document.getElementById('events-ticker');
    if (!ticker) return;
    const items = this.state.events.slice(0, 8)
      .map(e => `<span class="event-item">${e.text}</span>`).join('');
    // Duplicate content for infinite scroll animation
    ticker.innerHTML = items + items;
  }

  // ═══════════ ARMY PANEL ═══════════

  _showArmyPanel() {
    this.panelTitle.textContent = 'АРМИЯ';
    const p = this.state.humanPlayer;
    const groups = {};
    for (const u of p.units) {
      if (!groups[u.type]) groups[u.type] = [];
      groups[u.type].push(u);
    }

    let html = '';

    // Squadrons
    const squads = this.engine.squadrons.getForPlayer(p.units);
    if (squads.length) {
      html += `<div class="section-title">⭐ ЭСКАДРИЛЬИ (${squads.length})</div>`;
      for (const sq of squads) {
        html += `<div class="vehicle-card" style="border-left:3px solid #ffd600">
          <div class="vehicle-info">
            <div class="vehicle-name">${sq.name} (${sq.units.length} юнитов)</div>
            <div class="vehicle-type">${sq.domain} • ${sq.formation}</div>
          </div></div>`;
      }
    }

    for (const [type, units] of Object.entries(groups)) {
      html += `<div class="section-title">${units[0]?.icon || ''} ${units[0]?.name?.split('-')[0]?.toUpperCase() || type} (${units.length})</div>`;
      for (const u of units) {
        const hpPct = Math.round((u.hp / u.maxHp) * 100);
        const ammoPct = u.ammoMax > 0 ? Math.round((u.ammo / u.ammoMax) * 100) : -1;
        const cargoInfo = u.cargo?.length ? ` • 📦${u.cargo.length}/${u.capacity}` : '';
        const statusLabel = u.status === 'loaded' ? '📦 В транспорте' : u.status;
        html += `
          <div class="vehicle-card" data-unit-id="${u.id}">
            <div class="vehicle-type-icon">${u.icon}</div>
            <div class="vehicle-info">
              <div class="vehicle-name">${u.name}</div>
              <div class="vehicle-type">${statusLabel} • Мощь: ${u.power}${cargoInfo}</div>
              <div class="vehicle-hp-bar"><div class="vehicle-hp-fill" style="width:${hpPct}%"></div></div>
              ${ammoPct >= 0 ? `<div class="vehicle-hp-bar" style="margin-top:2px"><div class="vehicle-hp-fill" style="width:${ammoPct}%;background:#ffd600"></div></div>` : ''}
            </div>
          </div>`;
      }
    }

    if (p.units.length === 0) {
      html = '<p style="color:var(--text-muted);text-align:center;padding:20px;">Нет юнитов</p>';
    }

    this.panelContent.innerHTML = html;

    this.panelContent.querySelectorAll('.vehicle-card').forEach(card => {
      card.addEventListener('click', () => {
        const unit = this.state.units.find(u => u.id === card.dataset.unitId);
        if (unit) {
          this.state.deselectAll();
          unit.selected = true;
          if (unit.status !== 'loaded') this.engine.leafletMap.flyTo(unit.lat, unit.lng, 10);
          this.engine.leafletMap.invalidate();
        }
      });
    });
  }

  // ═══════════ BUILDER — TABS ═══════════

  _showBuilderTabs() {
    this.panelTitle.textContent = 'КОНСТРУКТОР';
    this.panelContent.innerHTML = `
      <div class="builder-tabs">
        <button class="builder-tab active" data-tab="aircraft">✈️ Авиация</button>
        <button class="builder-tab" data-tab="naval">🚢 Флот</button>
        <button class="builder-tab" data-tab="infantry">👥 Пехота</button>
        <button class="builder-tab" data-tab="aa">🎯 ПВО</button>
      </div>
      <div id="builder-content"></div>`;

    this.panelContent.querySelectorAll('.builder-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.panelContent.querySelectorAll('.builder-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderBuilderTab(btn.dataset.tab);
      });
    });
    this._renderBuilderTab('aircraft');
  }

  _renderBuilderTab(tab) {
    const categories = {
      aircraft: AIRCRAFT_CATEGORIES,
      naval: NAVAL_CATEGORIES,
      infantry: INFANTRY_CATEGORIES,
      aa: AA_CATEGORIES,
    }[tab];

    const detectFn = {
      aircraft: determineAircraftType,
      naval: determineShipType,
      infantry: determineInfantryType,
      aa: () => ({ type: 'aa', label: 'ПВО', icon: '🎯' }),
    }[tab];

    const container = document.getElementById('builder-content');
    const selected = {};
    let totalCost = 0;

    const render = () => {
      totalCost = 0;
      const totalStats = {};

      // Calculate totals
      for (const cat of categories) {
        const items = Array.isArray(selected[cat.id]) ? selected[cat.id] : (selected[cat.id] ? [selected[cat.id]] : []);
        for (const item of items) {
          if (!item) continue;
          totalCost += item.cost;
          for (const [k, v] of Object.entries(item.stats || {})) {
            totalStats[k] = (totalStats[k] || 0) + v;
          }
        }
      }

      const detected = detectFn(selected);

      let html = '';

      // Category selectors
      for (const cat of categories) {
        html += `<div class="section-title">${cat.icon} ${cat.name}${cat.required ? ' *' : ''}</div>`;
        for (const item of cat.items) {
          const isSel = Array.isArray(selected[cat.id])
            ? selected[cat.id].some(s => s?.id === item.id)
            : selected[cat.id]?.id === item.id;
          html += `
            <div class="comp-option ${isSel ? 'comp-selected' : ''}" data-cat="${cat.id}" data-item="${item.id}">
              <span>${item.icon} ${item.name}</span>
              <span style="color:var(--accent)">${formatMoney(item.cost)}</span>
            </div>`;
        }
      }

      // Stats preview
      html += `<div class="section-title" style="margin-top:12px">📊 ХАРАКТЕРИСТИКИ</div>`;
      for (const key of STAT_KEYS) {
        const val = totalStats[key] || 0;
        if (val === 0) continue;
        const pct = Math.min(100, Math.max(0, (val / MAX_STAT) * 100));
        html += `<div style="margin:3px 0;font-size:12px">
          <span>${STAT_LABELS[key] || key}: ${val}</span>
          <div class="vehicle-hp-bar"><div class="vehicle-hp-fill" style="width:${pct}%;background:var(--accent)"></div></div>
        </div>`;
      }

      html += `<div style="text-align:center;margin-top:12px;font-size:14px;color:var(--accent)">
        ${detected?.icon || ''} ${detected?.label || ''} • ${formatMoney(totalCost)}</div>`;

      html += `<button id="btn-build-unit" style="width:100%;margin-top:10px;padding:10px;background:var(--accent);color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px">
        🔨 ПРОИЗВЕСТИ ${formatMoney(totalCost)}</button>`;

      container.innerHTML = html;

      // Bind component selection
      container.querySelectorAll('.comp-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const cat = categories.find(c => c.id === opt.dataset.cat);
          const item = cat.items.find(i => i.id === opt.dataset.item);
          if (cat.max > 1) {
            if (!Array.isArray(selected[cat.id])) selected[cat.id] = [];
            const idx = selected[cat.id].findIndex(s => s?.id === item.id);
            if (idx >= 0) selected[cat.id].splice(idx, 1);
            else if (selected[cat.id].length < cat.max) selected[cat.id].push(item);
          } else {
            selected[cat.id] = selected[cat.id]?.id === item.id ? null : item;
          }
          render();
        });
      });

      // Build button
      container.querySelector('#btn-build-unit')?.addEventListener('click', () => {
        const p = this.state.humanPlayer;
        if (p.money < totalCost) { this.state.addEvent('❌ Недостаточно средств'); this.updateEvents(); return; }
        if (!detected) return;

        // Check required categories
        for (const cat of categories) {
          if (cat.required && !selected[cat.id]) {
            this.state.addEvent(`❌ Выберите: ${cat.name}`); this.updateEvents(); return;
          }
        }

        p.money -= totalCost;
        const hq = p.buildings[0];
        if (hq) {
          this.state.addUnit(p, detected.type, hq.lat + (Math.random()-0.5)*0.1, hq.lng + (Math.random()-0.5)*0.1);
          this.state.addEvent(`✅ Построен: ${detected.icon} ${detected.label}`);
          this.updateHUD(); this.updateEvents();
        }
      });
    };

    render();
  }

  // ═══════════ BASES PANEL ═══════════

  _showBasesPanel() {
    this.panelTitle.textContent = 'БАЗЫ';
    const p = this.state.humanPlayer;
    let html = '';

    for (const b of p.buildings) {
      let extra = '';
      if (b.type === 'warehouse') {
        const pct = Math.round((b.ammo / b.ammoMax) * 100);
        extra = `<div style="margin-top:4px;font-size:11px">📦 Боеприпасы: ${b.ammo}/${b.ammoMax}</div>
          <div class="vehicle-hp-bar"><div class="vehicle-hp-fill" style="width:${pct}%;background:#ffd600"></div></div>`;
      }
      if (b.type === 'repair') {
        extra = `<div style="margin-top:4px;font-size:11px">🔧 Ремонт: ${b.repairRate || 5} HP/тик</div>`;
      }

      const hpPct = Math.round((b.hp / b.maxHp) * 100);
      html += `
        <div class="vehicle-card" data-bld-id="${b.id}">
          <div class="vehicle-type-icon">${b.icon}</div>
          <div class="vehicle-info">
            <div class="vehicle-name">${b.name}</div>
            <div class="vehicle-type">Радиус: ${b.radiusKm} км</div>
            <div class="vehicle-hp-bar"><div class="vehicle-hp-fill" style="width:${hpPct}%"></div></div>
            ${extra}
          </div>
        </div>`;
    }

    if (p.buildings.length === 0) html = '<p style="color:var(--text-muted);text-align:center;padding:20px;">Нет зданий</p>';
    this.panelContent.innerHTML = html;

    this.panelContent.querySelectorAll('.vehicle-card').forEach(card => {
      card.addEventListener('click', () => {
        const bld = this.state.buildings.find(b => b.id === card.dataset.bldId);
        if (bld) this.engine.leafletMap.flyTo(bld.lat, bld.lng, 10);
      });
    });
  }

  // ═══════════ STOCKS ═══════════

  _showStocksPanel() {
    this.panelTitle.textContent = 'БИРЖА';
    let html = '';
    for (const stock of this.state.stocks) {
      const prev = stock.history.length > 1 ? stock.history[stock.history.length - 2] : stock.price;
      const change = stock.price - prev;
      const pct = prev > 0 ? ((change / prev) * 100).toFixed(2) : '0.00';
      const color = change >= 0 ? '#00e676' : '#ff1744';
      const arrow = change >= 0 ? '▲' : '▼';
      const driverLabel = { buildings: '🏗️ Здания', wars: '⚔️ Войны', units: '🛡️ Юниты', territory: '🗺️ Территория', power: '💪 Мощь' }[stock.driver] || '';

      html += `<div class="stock-row">
        <div>${stock.icon} <strong>${stock.name}</strong> <span style="font-size:10px;color:var(--text-muted)">${driverLabel}</span></div>
        <div style="color:${color}">${stock.price.toFixed(2)} ${arrow} ${pct}%</div>
      </div>`;
    }
    this.panelContent.innerHTML = html;
  }

  // ═══════════ PREDICTIONS ═══════════

  _showPredictionsPanel() {
    this.panelTitle.textContent = 'ПРОГНОЗЫ';
    const p = this.state.humanPlayer;
    let html = '';

    for (const pred of this.state.predictions) {
      const status = pred.resolved ? '✅ Завершён' : '⏳ Активен';
      html += `<div class="prediction-card" style="margin:8px 0;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px">
        <div style="font-weight:600;margin-bottom:4px">${pred.question}</div>
        <div style="font-size:11px;color:var(--text-muted)">Пул: ${formatMoney(pred.pool)} • ${status}</div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="pred-btn" data-pred="${pred.id}" data-side="yes" style="flex:1;padding:6px;background:#00e676;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:600">Да (${(pred.oddsYes * 100).toFixed(0)}%)</button>
          <button class="pred-btn" data-pred="${pred.id}" data-side="no" style="flex:1;padding:6px;background:#ff1744;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">Нет (${(pred.oddsNo * 100).toFixed(0)}%)</button>
        </div>
      </div>`;
    }

    this.panelContent.innerHTML = html;

    this.panelContent.querySelectorAll('.pred-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amount = 500;
        const result = this.state.placeBet(btn.dataset.pred, btn.dataset.side, amount, p.id);
        if (result) {
          this.state.addEvent(`🎲 Ставка ${formatMoney(amount)} на "${btn.dataset.side === 'yes' ? 'Да' : 'Нет'}"`);
          this.updateHUD();
          this.updateEvents();
          this._showPredictionsPanel();
        }
      });
    });
  }

  // ═══════════ UNIT INFO / PLACEMENT ═══════════

  showUnitInfo(unit) {
    this.panelTitle.textContent = unit.name;
    const ammoPct = unit.ammoMax > 0 ? Math.round((unit.ammo / unit.ammoMax) * 100) : -1;
    let html = `<div style="text-align:center;font-size:32px">${unit.icon}</div>
      <div class="section-title">HP: ${unit.hp}/${unit.maxHp}</div>
      <div class="vehicle-hp-bar"><div class="vehicle-hp-fill" style="width:${Math.round(unit.hp/unit.maxHp*100)}%"></div></div>`;

    if (ammoPct >= 0) {
      html += `<div class="section-title" style="margin-top:8px">🔫 Боеприпасы: ${unit.ammo}/${unit.ammoMax}</div>
        <div class="vehicle-hp-bar"><div class="vehicle-hp-fill" style="width:${ammoPct}%;background:#ffd600"></div></div>`;
    }

    html += `<div style="margin-top:8px;font-size:12px;color:var(--text-muted)">
      Мощь: ${unit.power} • Скорость: ${unit.speed} • Статус: ${unit.status}</div>`;

    if (unit.cargo?.length > 0) {
      html += `<div class="section-title" style="margin-top:8px">📦 Груз (${unit.cargo.length}/${unit.capacity})</div>`;
      for (const c of unit.cargo) html += `<div style="font-size:12px">${c.icon} ${c.name}</div>`;
    }

    if (unit.capacity > 0) {
      html += `<button class="action-btn" onclick="document.dispatchEvent(new CustomEvent('unit-action',{detail:'load'}))">📦 Загрузить пехоту</button>`;
      if (unit.cargo?.length) html += `<button class="action-btn" onclick="document.dispatchEvent(new CustomEvent('unit-action',{detail:'unload'}))">📤 Выгрузить</button>`;
    }

    this.panelContent.innerHTML = html;
  }

  showUnitPlacement(lat, lng) {
    const p = this.state.humanPlayer;
    const unitTypes = [
      { type: 'fighter', name: 'Истребитель', icon: '✈️', cost: 8000 },
      { type: 'bomber', name: 'Бомбардировщик', icon: '💣', cost: 12000 },
      { type: 'helicopter', name: 'Вертолёт', icon: '🚁', cost: 6000 },
      { type: 'tank', name: 'Танк', icon: '🛡️', cost: 7000 },
      { type: 'infantry', name: 'Мотострелки', icon: '👥', cost: 2000 },
      { type: 'airborne', name: 'Десантники', icon: '🪂', cost: 3000 },
      { type: 'marine', name: 'Морпехи', icon: '⚓', cost: 3500 },
      { type: 'specops', name: 'Спецназ', icon: '🥷', cost: 8000 },
      { type: 'sniper', name: 'Снайперы', icon: '🎯', cost: 5000 },
      { type: 'engineer', name: 'Сапёры', icon: '🔧', cost: 2500 },
      { type: 'apc', name: 'БТР', icon: '🚛', cost: 4000 },
      { type: 'aa', name: 'ПВО', icon: '🎯', cost: 6000 },
      { type: 'missile', name: 'РСЗО', icon: '🚀', cost: 10000 },
      { type: 'ship', name: 'Корабль', icon: '🚢', cost: 15000 },
      { type: 'submarine', name: 'Подлодка', icon: '🐟', cost: 12000 },
    ];

    const isWater = this.engine.terrain.isWater(lat, lng);

    this.panelTitle.textContent = 'РАЗМЕСТИТЬ ЮНИТ';
    let html = '';
    for (const ut of unitTypes) {
      const def = this.state.getUnitDef(ut.type);
      const domain = def?.domain || 'land';
      // Validate domain vs terrain
      const canPlace = (domain === 'sea' && isWater) || (domain === 'land' && !isWater) || domain === 'air';
      const disabled = !canPlace || p.money < ut.cost;
      const reason = !canPlace ? (isWater ? '(только суша)' : '(только вода)') : '';
      html += `<div class="vehicle-card ${disabled ? 'disabled' : ''}" data-place-type="${disabled ? '' : ut.type}" style="${disabled ? 'opacity:0.4' : ''}">
        <div class="vehicle-type-icon">${ut.icon}</div>
        <div class="vehicle-info">
          <div class="vehicle-name">${ut.name} ${reason}</div>
          <div class="vehicle-type">${formatMoney(ut.cost)}</div>
        </div>
      </div>`;
    }
    this.panelContent.innerHTML = html;

    this.panelContent.querySelectorAll('.vehicle-card[data-place-type]').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.placeType;
        if (!type) return;
        const def = this.state.getUnitDef(type);
        if (!def || p.money < def.cost) return;
        p.money -= def.cost;
        this.state.addUnit(p, type, lat, lng);
        this.state.addEvent(`✅ Размещён: ${def.name}`);
        this.updateHUD(); this.updateEvents();
        this.showUnitPlacement(lat, lng);
      });
    });
  }
}
