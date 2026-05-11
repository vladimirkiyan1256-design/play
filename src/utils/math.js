/* ═══════════════════════════════════════════════════════════
   AEROWAR — Math & Geometry Utilities
   ═══════════════════════════════════════════════════════════ */

/** Clamp value between min and max */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/** Linear interpolation */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Convert degrees to radians */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/** Convert longitude to Mercator X (0..1 normalized) */
export function lonToX(lon) {
  return (lon + 180) / 360;
}

/** Convert latitude to Mercator Y (0..1 normalized, clamped) */
export function latToY(lat) {
  const latRad = degToRad(clamp(lat, -85, 85));
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return 0.5 - mercN / (2 * Math.PI);
}

/**
 * Point-in-polygon test (ray-casting algorithm).
 * @param {number} px - X of point
 * @param {number} py - Y of point
 * @param {number[][]} polygon - Array of [x, y] screen-space coords
 * @returns {boolean}
 */
export function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Calculate centroid of a polygon (screen coords) */
export function polygonCentroid(points) {
  let cx = 0, cy = 0;
  for (const [x, y] of points) {
    cx += x;
    cy += y;
  }
  return [cx / points.length, cy / points.length];
}

/** Calculate approximate area (used for importance sorting) */
export function polygonArea(points) {
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += (points[j][0] + points[i][0]) * (points[j][1] - points[i][1]);
  }
  return Math.abs(area / 2);
}

/** Random integer between min (inclusive) and max (inclusive) */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random float between min and max */
export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/** Pick random element from array */
export function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Shuffle array in-place (Fisher-Yates) */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Format number with commas: 12345 → "12,345" */
export function formatNumber(n) {
  return n.toLocaleString('ru-RU');
}

/** Format money: 12345 → "$12,345" */
export function formatMoney(n) {
  return '$' + formatNumber(Math.round(n));
}

/** Distance between two points */
export function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/** Generate a unique ID */
let _idCounter = 0;
export function uid(prefix = 'id') {
  return `${prefix}_${++_idCounter}_${Date.now().toString(36)}`;
}
