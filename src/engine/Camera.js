/* ═══════════════════════════════════════════════════════════
   AEROWAR — Camera (Pan / Zoom / Projection)
   ═══════════════════════════════════════════════════════════ */

import { clamp, lerp, lonToX, latToY } from '../utils/math.js';
import { MAP } from '../utils/constants.js';

export default class Camera {
  constructor(canvas) {
    this.canvas = canvas;

    // CSS pixel dimensions (set by engine on resize)
    this.viewWidth = window.innerWidth;
    this.viewHeight = window.innerHeight;

    // World-space offset (in normalized 0..1 Mercator coords)
    this.x = 0.5; // center of map
    this.y = 0.4; // slightly north
    this.zoom = MAP.DEFAULT_ZOOM;

    // Smooth follow targets
    this._targetX = this.x;
    this._targetY = this.y;
    this._targetZoom = this.zoom;

    // Dragging state
    this._dragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._dragCamStartX = 0;
    this._dragCamStartY = 0;
  }

  /** Width in CSS pixels */
  get width() { return this.viewWidth; }
  /** Height in CSS pixels */
  get height() { return this.viewHeight; }

  /**
   * Convert world-normalized coords to screen pixel coords.
   * @param {number} wx - Normalized X (0..1)
   * @param {number} wy - Normalized Y (0..1)
   * @returns {[number, number]}
   */
  worldToScreen(wx, wy) {
    const scale = this.zoom * this.width;
    const sx = (wx - this.x) * scale + this.width / 2;
    const sy = (wy - this.y) * scale + this.height / 2;
    return [sx, sy];
  }

  /**
   * Convert screen pixel coords to world-normalized coords.
   * @param {number} sx - Screen X
   * @param {number} sy - Screen Y
   * @returns {[number, number]}
   */
  screenToWorld(sx, sy) {
    const scale = this.zoom * this.width;
    const wx = (sx - this.width / 2) / scale + this.x;
    const wy = (sy - this.height / 2) / scale + this.y;
    return [wx, wy];
  }

  /**
   * Convert GeoJSON [longitude, latitude] to screen [x, y].
   */
  geoToScreen(lon, lat) {
    return this.worldToScreen(lonToX(lon), latToY(lat));
  }

  /**
   * Handle zoom (from mouse wheel delta).
   * Zooms toward the cursor position.
   */
  handleZoom(delta, screenX, screenY) {
    const [wx, wy] = this.screenToWorld(screenX, screenY);
    const factor = 1 - delta * MAP.ZOOM_SPEED;
    this._targetZoom = clamp(this._targetZoom * factor, MAP.MIN_ZOOM, MAP.MAX_ZOOM);

    // Adjust offset so the cursor stays under the same world point
    const newScale = this._targetZoom * this.width;
    this._targetX = wx - (screenX - this.width / 2) / newScale;
    this._targetY = wy - (screenY - this.height / 2) / newScale;
  }

  /** Start dragging */
  startDrag(screenX, screenY) {
    this._dragging = true;
    this._dragStartX = screenX;
    this._dragStartY = screenY;
    this._dragCamStartX = this.x;
    this._dragCamStartY = this.y;
  }

  /** Update dragging */
  moveDrag(screenX, screenY) {
    if (!this._dragging) return;
    const scale = this.zoom * this.width;
    const dx = (screenX - this._dragStartX) / scale;
    const dy = (screenY - this._dragStartY) / scale;
    this._targetX = this._dragCamStartX - dx;
    this._targetY = this._dragCamStartY - dy;
  }

  /** End dragging */
  endDrag() {
    this._dragging = false;
  }

  /** Returns true if currently panning */
  get isDragging() {
    return this._dragging;
  }

  /** Smoothly animate toward target position/zoom */
  update(dt) {
    const t = 1 - Math.exp(-10 * dt); // exponential smoothing
    this.x = lerp(this.x, this._targetX, t);
    this.y = lerp(this.y, this._targetY, t);
    this.zoom = lerp(this.zoom, this._targetZoom, t);
  }

  /** Jump directly to a geo position */
  lookAt(lon, lat, zoom) {
    this._targetX = lonToX(lon);
    this._targetY = latToY(lat);
    if (zoom != null) this._targetZoom = zoom;
  }

  /** Get the visible bounding box in world coords */
  getVisibleBounds() {
    const [minX, minY] = this.screenToWorld(0, 0);
    const [maxX, maxY] = this.screenToWorld(this.width, this.height);
    return { minX, minY, maxX, maxY };
  }
}
