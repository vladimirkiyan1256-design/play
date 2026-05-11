/* ═══════════════════════════════════════════════════════════
   AEROWAR v2 — Leaflet Map + Cell Grid Territory System
   ═══════════════════════════════════════════════════════════ */

import L from 'leaflet';
import { FACTION_COLORS } from '../utils/constants.js';
import { getPlayerColor, hexToRgba } from '../utils/colors.js';

/** Size of one cell in degrees (≈3km at equator) */
const CELL_SIZE = 0.03;
/** How fast cells expand per second */
const EXPAND_RATE = 0.4;

export default class LeafletMap {
  /**
   * @param {HTMLElement} container
   * @param {Function} onMapClick - (latlng, event) => void
   * @param {Function} onContextMenu - (latlng, pixel, event) => void
   */
  constructor(container, onMapClick, onContextMenu) {
    // Leaflet map
    this.map = L.map(container, {
      center: [30, 20],
      zoom: 3,
      minZoom: 2,
      maxZoom: 15,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    });

    // Tile layer — CartoDB Voyager (terrain-like, neutral colors)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(this.map);

    // Canvas overlay for cells, units, effects
    this.overlayCanvas = document.getElementById('overlay-canvas');
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    this._resizeOverlay();
    window.addEventListener('resize', () => this._resizeOverlay());

    /** When true, skip 2D unit/building icons (3D overlay handles them) */
    this.show3D = false;

    // Cell grid for territory
    /** @type {Map<string, {owner: string, colorIndex: number, lat: number, lng: number}>} */
    this.cells = new Map();

    // Event handlers
    this.map.on('click', (e) => onMapClick(e.latlng, e));
    this.map.on('contextmenu', (e) => {
      e.originalEvent.preventDefault();
      const pixel = this.map.latLngToContainerPoint(e.latlng);
      onContextMenu(e.latlng, { x: pixel.x, y: pixel.y }, e);
    });

    // Redraw overlay on map move
    this.map.on('moveend', () => this._needsRedraw = true);
    this.map.on('zoomend', () => this._needsRedraw = true);
    this.map.on('move', () => this._needsRedraw = true);
    this._needsRedraw = true;
  }

  _resizeOverlay() {
    const dpr = window.devicePixelRatio || 1;
    this.overlayCanvas.width = window.innerWidth * dpr;
    this.overlayCanvas.height = window.innerHeight * dpr;
    this.overlayCanvas.style.width = window.innerWidth + 'px';
    this.overlayCanvas.style.height = window.innerHeight + 'px';
    this.overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._needsRedraw = true;
  }

  // ═══════════════════════════════════════
  // CELL GRID — Pixel Conquest
  // ═══════════════════════════════════════

  /** Get cell key from lat/lng */
  _cellKey(lat, lng) {
    const r = Math.floor(lat / CELL_SIZE);
    const c = Math.floor(lng / CELL_SIZE);
    return `${r},${c}`;
  }

  /** Get cell center lat/lng from key */
  _cellCenter(key) {
    const [r, c] = key.split(',').map(Number);
    return {
      lat: r * CELL_SIZE + CELL_SIZE / 2,
      lng: c * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  /** Claim cells in a radius around lat/lng for a player */
  claimArea(lat, lng, radiusKm, playerId, colorIndex) {
    const radiusDeg = radiusKm / 111.32; // rough km-to-degrees
    const steps = Math.ceil(radiusDeg / CELL_SIZE);

    const centerR = Math.floor(lat / CELL_SIZE);
    const centerC = Math.floor(lng / CELL_SIZE);

    let claimed = 0;
    for (let dr = -steps; dr <= steps; dr++) {
      for (let dc = -steps; dc <= steps; dc++) {
        const r = centerR + dr;
        const c = centerC + dc;
        const cellLat = r * CELL_SIZE + CELL_SIZE / 2;
        const cellLng = c * CELL_SIZE + CELL_SIZE / 2;
        const dist = Math.sqrt((cellLat - lat) ** 2 + (cellLng - lng) ** 2);
        if (dist <= radiusDeg) {
          const key = `${r},${c}`;
          if (!this.cells.has(key) || this.cells.get(key).owner !== playerId) {
            this.cells.set(key, { owner: playerId, colorIndex, lat: cellLat, lng: cellLng });
            claimed++;
          }
        }
      }
    }
    this._needsRedraw = true;
    return claimed;
  }

  /** Expand existing territory by one cell layer */
  expandTerritory(playerId, colorIndex, rate = 1) {
    const frontier = [];
    const owned = new Set();

    for (const [key, cell] of this.cells) {
      if (cell.owner === playerId) {
        owned.add(key);
        const [r, c] = key.split(',').map(Number);
        // Check 4 neighbors
        const neighbors = [
          `${r - 1},${c}`, `${r + 1},${c}`,
          `${r},${c - 1}`, `${r},${c + 1}`,
        ];
        for (const nk of neighbors) {
          if (!this.cells.has(nk)) {
            frontier.push(nk);
          }
        }
      }
    }

    // Expand to random subset of frontier
    const expandCount = Math.min(frontier.length, Math.ceil(frontier.length * rate * EXPAND_RATE));
    const shuffled = frontier.sort(() => Math.random() - 0.5);
    for (let i = 0; i < expandCount; i++) {
      const key = shuffled[i];
      const [r, c] = key.split(',').map(Number);
      this.cells.set(key, {
        owner: playerId,
        colorIndex,
        lat: r * CELL_SIZE + CELL_SIZE / 2,
        lng: c * CELL_SIZE + CELL_SIZE / 2,
      });
    }
    this._needsRedraw = true;
    return expandCount;
  }

  /** Count cells owned by a player */
  countCells(playerId) {
    let count = 0;
    for (const cell of this.cells.values()) {
      if (cell.owner === playerId) count++;
    }
    return count;
  }

  /** Get approximate territory area in km² */
  getAreaKm2(playerId) {
    const count = this.countCells(playerId);
    // Each cell ≈ CELL_SIZE² degrees ≈ (CELL_SIZE*111)² km² at equator
    const cellAreaKm2 = (CELL_SIZE * 111.32) ** 2;
    return Math.round(count * cellAreaKm2);
  }

  /** Check if a lat/lng point is in a player's territory */
  isInTerritory(lat, lng, playerId) {
    const key = this._cellKey(lat, lng);
    const cell = this.cells.get(key);
    return cell && cell.owner === playerId;
  }

  /** Get owner of a cell at lat/lng */
  getCellOwner(lat, lng) {
    const key = this._cellKey(lat, lng);
    const cell = this.cells.get(key);
    return cell ? cell.owner : null;
  }

  /** Attack enemy cells near a position */
  attackCells(lat, lng, radiusKm, attackerId, colorIndex, power) {
    const radiusDeg = radiusKm / 111.32;
    const steps = Math.ceil(radiusDeg / CELL_SIZE);
    const centerR = Math.floor(lat / CELL_SIZE);
    const centerC = Math.floor(lng / CELL_SIZE);
    let captured = 0;

    for (let dr = -steps; dr <= steps; dr++) {
      for (let dc = -steps; dc <= steps; dc++) {
        const r = centerR + dr;
        const c = centerC + dc;
        const key = `${r},${c}`;
        const cell = this.cells.get(key);
        if (cell && cell.owner !== attackerId) {
          const cellLat = r * CELL_SIZE + CELL_SIZE / 2;
          const cellLng = c * CELL_SIZE + CELL_SIZE / 2;
          const dist = Math.sqrt((cellLat - lat) ** 2 + (cellLng - lng) ** 2);
          if (dist <= radiusDeg && Math.random() < power * 0.02) {
            this.cells.set(key, { owner: attackerId, colorIndex, lat: cellLat, lng: cellLng });
            captured++;
          }
        }
      }
    }
    this._needsRedraw = true;
    return captured;
  }

  // ═══════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════

  /** Render cells + units on overlay canvas */
  render(units, buildings, animations) {
    if (!this._needsRedraw && !animations?.length) return;

    const ctx = this.overlayCtx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    // Render territory cells
    this._renderCells(ctx);

    // Render buildings (skip in 3D mode)
    if (buildings && !this.show3D) this._renderBuildings(ctx, buildings);

    // Render units (skip in 3D mode)
    if (units && !this.show3D) this._renderUnits(ctx, units);

    // Render animations (skip in 3D mode — ThreeOverlay handles them)
    if (animations && !this.show3D) this._renderAnimations(ctx, animations);

    this._needsRedraw = false;
  }

  _renderCells(ctx) {
    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();

    // At low zoom, cells are tiny — use simplified render
    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();
    const minLng = bounds.getWest();
    const maxLng = bounds.getEast();

    // Group cells by color for batch rendering
    const colorBatches = new Map();

    for (const [key, cell] of this.cells) {
      if (cell.lat < minLat || cell.lat > maxLat || cell.lng < minLng || cell.lng > maxLng) continue;

      const color = getPlayerColor(cell.colorIndex);
      if (!colorBatches.has(color)) colorBatches.set(color, []);
      colorBatches.get(color).push(cell);
    }

    for (const [color, cells] of colorBatches) {
      ctx.fillStyle = hexToRgba(color, 0.35);
      ctx.beginPath();

      for (const cell of cells) {
        const topLeft = this.map.latLngToContainerPoint([
          cell.lat + CELL_SIZE / 2,
          cell.lng - CELL_SIZE / 2,
        ]);
        const bottomRight = this.map.latLngToContainerPoint([
          cell.lat - CELL_SIZE / 2,
          cell.lng + CELL_SIZE / 2,
        ]);
        const cw = Math.max(1, bottomRight.x - topLeft.x);
        const ch = Math.max(1, bottomRight.y - topLeft.y);
        ctx.rect(topLeft.x, topLeft.y, cw, ch);
      }

      ctx.fill();

      // Border for cells at higher zoom
      if (zoom >= 8) {
        ctx.strokeStyle = hexToRgba(color, 0.2);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  _renderBuildings(ctx, buildings) {
    for (const b of buildings) {
      const pt = this.map.latLngToContainerPoint([b.lat, b.lng]);
      if (pt.x < -50 || pt.x > window.innerWidth + 50 || pt.y < -50 || pt.y > window.innerHeight + 50) continue;

      const color = getPlayerColor(b.colorIndex);
      const zoom = this.map.getZoom();
      const size = Math.max(12, zoom * 3);

      // Building circle
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.3);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(color, 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();

      // Icon
      ctx.font = `${Math.max(10, size)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.icon, pt.x, pt.y);

      // Label at higher zoom
      if (zoom >= 6) {
        ctx.font = `600 ${Math.max(9, zoom)}px Rajdhani, sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.fillText(b.name, pt.x, pt.y + size + 10);
      }

      // Radius circle (dashed)
      if (zoom >= 5) {
        const radiusPx = this._kmToPixels(b.radiusKm, b.lat);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radiusPx, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(color, 0.15);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  _renderUnits(ctx, units) {
    const zoom = this.map.getZoom();

    for (const u of units) {
      const pt = this.map.latLngToContainerPoint([u.lat, u.lng]);
      if (pt.x < -30 || pt.x > window.innerWidth + 30 || pt.y < -30 || pt.y > window.innerHeight + 30) continue;

      const color = getPlayerColor(u.colorIndex);
      const size = Math.max(8, zoom * 2);

      // Unit body
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.7);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Selection ring
      if (u.selected) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Icon
      ctx.font = `${Math.max(10, size * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(u.icon, pt.x, pt.y);

      // Name label
      if (zoom >= 7) {
        ctx.font = `600 ${Math.max(8, zoom - 1)}px Rajdhani, sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(u.name, pt.x, pt.y + size + 8);
      }

      // HP bar
      if (u.hp < u.maxHp) {
        const barW = size * 2;
        const barH = 3;
        const barX = pt.x - barW / 2;
        const barY = pt.y - size - 6;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        const pct = u.hp / u.maxHp;
        ctx.fillStyle = pct > 0.5 ? '#00e676' : pct > 0.25 ? '#ffd600' : '#ff1744';
        ctx.fillRect(barX, barY, barW * pct, barH);
      }

      // Movement line
      if (u.targetLat != null && u.targetLng != null) {
        const target = this.map.latLngToContainerPoint([u.targetLat, u.targetLng]);
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = hexToRgba(color, 0.4);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  _renderAnimations(ctx, animations) {
    const now = Date.now();

    for (const anim of animations) {
      const progress = (now - anim.startTime) / anim.duration;
      if (progress > 1) continue;

      if (anim.type === 'missile') {
        const from = this.map.latLngToContainerPoint([anim.fromLat, anim.fromLng]);
        const to = this.map.latLngToContainerPoint([anim.toLat, anim.toLng]);

        // Bezier arc
        const midX = (from.x + to.x) / 2;
        const midY = Math.min(from.y, to.y) - 60;
        const t = Math.min(progress * 1.2, 1);
        const cx = (1 - t) ** 2 * from.x + 2 * (1 - t) * t * midX + t ** 2 * to.x;
        const cy = (1 - t) ** 2 * from.y + 2 * (1 - t) * t * midY + t ** 2 * to.y;

        // Trail
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(midX, midY, cx, cy);
        ctx.strokeStyle = `rgba(255, 100, 50, ${1 - progress})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Smoke particles along trail
        for (let i = 0; i < 5; i++) {
          const st = Math.max(0, t - i * 0.05);
          const sx = (1 - st) ** 2 * from.x + 2 * (1 - st) * st * midX + st ** 2 * to.x;
          const sy = (1 - st) ** 2 * from.y + 2 * (1 - st) * st * midY + st ** 2 * to.y;
          ctx.beginPath();
          ctx.arc(sx + (Math.random() - 0.5) * 4, sy + (Math.random() - 0.5) * 4, 2 + i, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 200, 200, ${0.3 - i * 0.05})`;
          ctx.fill();
        }

        // Missile head
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4400';
        ctx.fill();
        ctx.font = '10px sans-serif';
        ctx.fillText('🚀', cx - 5, cy - 8);

        // Impact explosion
        if (progress > 0.8) {
          const ep = (progress - 0.8) / 0.2;
          const radius = 5 + ep * 30;
          ctx.beginPath();
          ctx.arc(to.x, to.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 100, 20, ${0.6 * (1 - ep)})`;
          ctx.fill();
          ctx.font = `${12 + ep * 16}px sans-serif`;
          ctx.globalAlpha = 1 - ep;
          ctx.fillText('💥', to.x - 10, to.y);
          ctx.globalAlpha = 1;
        }
      }

      if (anim.type === 'explosion') {
        const pt = this.map.latLngToContainerPoint([anim.lat, anim.lng]);
        const radius = 5 + progress * 40;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 80, 0, ${0.7 * (1 - progress)})`;
        ctx.fill();
        // Ring
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius * 1.3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 200, 50, ${0.4 * (1 - progress)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (anim.type === 'gunfire') {
        const from = this.map.latLngToContainerPoint([anim.fromLat, anim.fromLng]);
        const to = this.map.latLngToContainerPoint([anim.toLat, anim.toLng]);
        const t = Math.min(progress * 3, 1);
        const cx = from.x + (to.x - from.x) * t;
        const cy = from.y + (to.y - from.y) * t;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = `rgba(255, 255, 100, ${1 - progress})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  /** Convert km to screen pixels at given latitude */
  _kmToPixels(km, lat) {
    const p1 = this.map.latLngToContainerPoint([lat, 0]);
    const degPerKm = 1 / 111.32;
    const p2 = this.map.latLngToContainerPoint([lat, km * degPerKm]);
    return Math.abs(p2.x - p1.x);
  }

  /** Fly to a location */
  flyTo(lat, lng, zoom = 8) {
    this.map.flyTo([lat, lng], zoom, { duration: 1.5 });
  }

  /** Force redraw next frame */
  invalidate() {
    this._needsRedraw = true;
  }
}
