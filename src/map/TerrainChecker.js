/* ═══════════════════════════════════════════════════════════
   AEROWAR v2 — Terrain Checker (Water/Land via tile color)
   ═══════════════════════════════════════════════════════════ */

/**
 * Detects water vs land by sampling the Leaflet tile pixel color.
 * CartoDB Voyager tiles render water as a distinct light blue.
 */
export default class TerrainChecker {
  constructor(leafletMap) {
    this.map = leafletMap;
    /** @type {Map<string, boolean>} cache: cellKey → isWater */
    this._cache = new Map();
    this._tileCanvas = document.createElement('canvas');
    this._tileCtx = this._tileCanvas.getContext('2d', { willReadFrequently: true });
    this._tileCanvas.width = 256;
    this._tileCanvas.height = 256;
  }

  /**
   * Check if a lat/lng is water (quick cache-first).
   * Returns cached value or samples tile.
   */
  isWater(lat, lng) {
    const key = `${Math.round(lat * 100)},${Math.round(lng * 100)}`;
    if (this._cache.has(key)) return this._cache.get(key);

    // Sample the overlay canvas pixel at this position
    const pt = this.map.map.latLngToContainerPoint([lat, lng]);
    // Sample from underlying map tiles
    const result = this._sampleTileAt(lat, lng);
    this._cache.set(key, result);
    return result;
  }

  /**
   * Sample tile pixel to detect water.
   * CartoDB Voyager water color: ~rgb(170, 211, 223) or similar light blue
   */
  _sampleTileAt(lat, lng) {
    try {
      const zoom = Math.min(this.map.map.getZoom(), 10);
      const n = Math.pow(2, zoom);
      const xtile = Math.floor(((lng + 180) / 360) * n);
      const latRad = (lat * Math.PI) / 180;
      const ytile = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);

      // Get pixel within the tile
      const xfrac = ((lng + 180) / 360) * n - xtile;
      const yfrac = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n - ytile;

      // Try to find the tile element in the DOM
      const tilePane = this.map.map.getPane('tilePane');
      if (!tilePane) return false;

      const tiles = tilePane.querySelectorAll('img');
      for (const tile of tiles) {
        const src = tile.src || '';
        // Check if this is roughly our tile
        if (src.includes(`/${zoom}/`) && src.includes(`/${xtile}/`) && src.includes(`/${ytile}`)) {
          // Draw tile to canvas and sample pixel
          try {
            this._tileCtx.clearRect(0, 0, 256, 256);
            this._tileCtx.drawImage(tile, 0, 0, 256, 256);
            const px = Math.floor(xfrac * 256);
            const py = Math.floor(yfrac * 256);
            const data = this._tileCtx.getImageData(px, py, 1, 1).data;
            return this._isWaterColor(data[0], data[1], data[2]);
          } catch (e) {
            // CORS — can't read tile pixels; use heuristic
            return this._heuristicWater(lat, lng);
          }
        }
      }

      // Fallback: heuristic-based detection
      return this._heuristicWater(lat, lng);
    } catch {
      return this._heuristicWater(lat, lng);
    }
  }

  /** Check if RGB is water-like (CartoDB Voyager: light blue/grey-blue) */
  _isWaterColor(r, g, b) {
    // Water on CartoDB Voyager: ~rgb(170, 211, 223) blue-ish
    // Land: various browns/greens/whites
    const blueRatio = b / (r + 1);
    const greenRatio = g / (r + 1);
    // Water: blue > red significantly, green slightly above red
    if (b > 180 && g > 180 && blueRatio > 1.1 && r < 190) return true;
    // Deep ocean: darker blue
    if (b > 150 && r < 130 && g < 180 && blueRatio > 1.3) return true;
    return false;
  }

  /**
   * Heuristic fallback: known ocean/sea areas.
   * Simple approximation for major water bodies.
   */
  _heuristicWater(lat, lng) {
    // Deep ocean check by lat/lng regions
    // Pacific center
    if (lng > 140 && lng < 220 && lat > -50 && lat < 50) return true;
    if (lng < -100 && lat > -50 && lat < 50) return true;
    // Atlantic center
    if (lng > -60 && lng < -10 && lat > -50 && lat < 60) {
      if (lat < -10 || lat > 35) return true; // Not Caribbean/Med
    }
    // Indian Ocean
    if (lng > 50 && lng < 100 && lat > -40 && lat < -5) return true;
    // Arctic
    if (lat > 75) return true;
    // Antarctic ocean
    if (lat < -60) return true;

    return false;
  }

  /** Clear cache (e.g. on zoom change) */
  clearCache() {
    this._cache.clear();
  }
}
