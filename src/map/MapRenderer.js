/* ═══════════════════════════════════════════════════════════
   AEROWAR — Map Renderer (Canvas)
   Renders world map from GeoJSON with colors & interactions
   ═══════════════════════════════════════════════════════════ */

import { getPlayerColor, hexToRgba } from '../utils/colors.js';
import { pointInPolygon } from '../utils/math.js';
import { OCEAN_COLOR, BORDER_COLOR, NEUTRAL_FILL, HOVER_FILL, NEUTRAL_COLOR } from '../utils/constants.js';

export default class MapRenderer {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../engine/Camera.js').default} camera
   */
  constructor(ctx, camera) {
    this.ctx = ctx;
    this.camera = camera;
  }

  /**
   * Render all territories.
   * @param {import('../map/Territory.js').default[]} territories
   * @param {number} mouseX - screen-space
   * @param {number} mouseY - screen-space
   */
  render(territories, mouseX, mouseY) {
    const ctx = this.ctx;
    const cam = this.camera;

    // Clear with ocean color
    ctx.fillStyle = OCEAN_COLOR;
    ctx.fillRect(0, 0, cam.width, cam.height);

    // Draw grid lines (subtle)
    this._drawGrid();

    // Determine hovered territory
    let hoveredTerritory = null;

    // Draw territories
    for (const terr of territories) {
      // Transform polygons to screen space
      terr.screenPolygons = terr.polygons.map(poly =>
        poly.map(([wx, wy]) => cam.worldToScreen(wx, wy))
      );

      // Update screen-space centroid
      if (terr.screenPolygons.length > 0) {
        // Use largest polygon's centroid
        const largest = terr.screenPolygons.reduce(
          (best, p) => (p.length > best.length ? p : best),
          terr.screenPolygons[0]
        );
        let cx = 0, cy = 0;
        for (const [x, y] of largest) { cx += x; cy += y; }
        terr.centroid = [cx / largest.length, cy / largest.length];
      }

      // Hit test for hover
      terr.hovered = false;
      for (const sp of terr.screenPolygons) {
        if (pointInPolygon(mouseX, mouseY, sp)) {
          hoveredTerritory = terr;
          terr.hovered = true;
          break;
        }
      }

      // Draw fill
      let fillColor;
      if (terr.ownerId) {
        const pColor = getPlayerColor(terr.ownerColorIndex);
        fillColor = hexToRgba(pColor, terr.selected ? 0.55 : 0.35);
      } else {
        fillColor = NEUTRAL_FILL;
      }

      for (const sp of terr.screenPolygons) {
        if (sp.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(sp[0][0], sp[0][1]);
        for (let i = 1; i < sp.length; i++) {
          ctx.lineTo(sp[i][0], sp[i][1]);
        }
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
    }

    // Draw borders (separate pass for crisp lines)
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 0.5;
    for (const terr of territories) {
      for (const sp of terr.screenPolygons) {
        if (sp.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(sp[0][0], sp[0][1]);
        for (let i = 1; i < sp.length; i++) {
          ctx.lineTo(sp[i][0], sp[i][1]);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Draw hover overlay
    if (hoveredTerritory) {
      for (const sp of hoveredTerritory.screenPolygons) {
        if (sp.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(sp[0][0], sp[0][1]);
        for (let i = 1; i < sp.length; i++) {
          ctx.lineTo(sp[i][0], sp[i][1]);
        }
        ctx.closePath();
        ctx.fillStyle = HOVER_FILL;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw selected territory highlight
    const selected = territories.find(t => t.selected);
    if (selected && selected !== hoveredTerritory) {
      for (const sp of selected.screenPolygons) {
        if (sp.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(sp[0][0], sp[0][1]);
        for (let i = 1; i < sp.length; i++) {
          ctx.lineTo(sp[i][0], sp[i][1]);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw territory names (only when zoomed in enough)
    if (cam.zoom > 2.5) {
      ctx.font = `600 ${Math.max(8, 11 / (cam.zoom * 0.3))}px Rajdhani, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const terr of territories) {
        if (terr.area < 0.00005) continue; // skip tiny territories
        const [cx, cy] = terr.centroid;
        if (cx < 0 || cx > cam.width || cy < 0 || cy > cam.height) continue;

        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(terr.name, cx, cy);
      }
    }

    // Draw resource icons (only when zoomed in more)
    if (cam.zoom > 4) {
      this._drawResourceIcons(territories);
    }

    return hoveredTerritory;
  }

  _drawGrid() {
    const ctx = this.ctx;
    const cam = this.camera;

    // Only show grid when somewhat zoomed in
    if (cam.zoom < 2) return;

    const alpha = Math.min(0.06, (cam.zoom - 2) * 0.015);
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 0.5;

    // Longitude lines every 30 degrees
    for (let lon = -180; lon <= 180; lon += 30) {
      const [sx] = cam.geoToScreen(lon, 0);
      if (sx < -10 || sx > cam.width + 10) continue;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, cam.height);
      ctx.stroke();
    }

    // Latitude lines every 20 degrees
    for (let lat = -80; lat <= 80; lat += 20) {
      const [, sy] = cam.geoToScreen(0, lat);
      if (sy < -10 || sy > cam.height + 10) continue;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(cam.width, sy);
      ctx.stroke();
    }
  }

  _drawResourceIcons(territories) {
    const ctx = this.ctx;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';

    for (const terr of territories) {
      if (terr.area < 0.0002) continue;
      const [cx, cy] = terr.centroid;
      if (cx < 0 || cx > this.camera.width || cy < 0 || cy > this.camera.height) continue;

      let offset = 0;
      for (const [key, val] of Object.entries(terr.resources)) {
        if (!val) continue;
        const icons = { oil: '🛢️', gold: '🥇', ore: '⛏️', food: '🌾' };
        ctx.fillText(`${icons[key] || '?'}${val}`, cx - 20 + offset, cy + 14);
        offset += 28;
      }
    }
  }

  /**
   * Render minimap.
   * @param {CanvasRenderingContext2D} miniCtx
   * @param {import('../map/Territory.js').default[]} territories
   * @param {number} miniW
   * @param {number} miniH
   */
  renderMinimap(miniCtx, territories, miniW, miniH) {
    miniCtx.fillStyle = OCEAN_COLOR;
    miniCtx.fillRect(0, 0, miniW, miniH);

    for (const terr of territories) {
      let fillColor;
      if (terr.ownerId) {
        fillColor = hexToRgba(getPlayerColor(terr.ownerColorIndex), 0.6);
      } else {
        fillColor = 'rgba(42, 52, 68, 0.5)';
      }

      for (const poly of terr.polygons) {
        if (poly.length < 3) continue;
        miniCtx.beginPath();
        const [x0, y0] = [poly[0][0] * miniW, poly[0][1] * miniH];
        miniCtx.moveTo(x0, y0);
        for (let i = 1; i < poly.length; i++) {
          miniCtx.lineTo(poly[i][0] * miniW, poly[i][1] * miniH);
        }
        miniCtx.closePath();
        miniCtx.fillStyle = fillColor;
        miniCtx.fill();
      }
    }

    // Draw viewport rectangle
    const bounds = this.camera.getVisibleBounds();
    const rx = bounds.minX * miniW;
    const ry = bounds.minY * miniH;
    const rw = (bounds.maxX - bounds.minX) * miniW;
    const rh = (bounds.maxY - bounds.minY) * miniH;
    miniCtx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
    miniCtx.lineWidth = 1.5;
    miniCtx.strokeRect(rx, ry, rw, rh);
  }
}
