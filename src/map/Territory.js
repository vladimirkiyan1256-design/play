/* ═══════════════════════════════════════════════════════════
   AEROWAR — Territory Model
   ═══════════════════════════════════════════════════════════ */

import { lonToX, latToY, polygonCentroid, polygonArea } from '../utils/math.js';
import { getCountryName, numericToIso3 } from '../utils/countryNames.js';

export default class Territory {
  /**
   * Build a Territory from a GeoJSON Feature.
   * @param {object} feature - GeoJSON feature
   * @param {number} index - Index in the features array
   */
  constructor(feature, index) {
    this.index = index;

    // Resolve ID: world-atlas uses numeric codes, others use ISO_A3
    const numericId = feature.id || feature.properties.id;
    const isoId = feature.properties.ISO_A3 || feature.properties.ADM0_A3;
    this.id = isoId || (numericId ? numericToIso3(numericId) : `T${index}`);
    this.numericId = numericId ? String(numericId) : null;

    // Resolve name from our database first, then feature properties
    this.name = getCountryName(this.numericId) 
      || getCountryName(this.id)
      || feature.properties.NAME 
      || feature.properties.ADMIN 
      || feature.properties.name
      || `Территория ${index}`;
    this.continent = feature.properties.CONTINENT || '';

    // Owner (null = neutral)
    this.ownerId = null;
    this.ownerColorIndex = -1;

    // Resources (randomly assigned at game start based on region)
    this.resources = {};
    this.population = 0;
    this.income = 0;

    // Military units stationed here
    this.aircraft = [];
    this.airDefenses = [];

    // Geometry (projected to normalized Mercator)
    this.polygons = []; // Array of polygons → each polygon is [[sx,sy], ...]
    this.screenPolygons = []; // After camera transform
    this.centroid = [0, 0]; // Screen-space centroid (updated each frame)
    this.area = 0;

    // Neighbours (computed after loading all territories)
    this.neighborIds = new Set();

    // Hover / selection state
    this.hovered = false;
    this.selected = false;

    // Parse geometry
    this._parseGeometry(feature.geometry);
  }

  _parseGeometry(geometry) {
    const type = geometry.type;
    let coordSets;
    if (type === 'Polygon') {
      coordSets = [geometry.coordinates[0]]; // outer ring only
    } else if (type === 'MultiPolygon') {
      coordSets = geometry.coordinates.map(poly => poly[0]);
    } else {
      coordSets = [];
    }

    this.polygons = coordSets.map(ring =>
      ring.map(([lon, lat]) => [lonToX(lon), latToY(lat)])
    );

    // Compute centroid of the largest polygon
    if (this.polygons.length > 0) {
      let largestIdx = 0;
      let largestArea = 0;
      this.polygons.forEach((poly, i) => {
        const a = polygonArea(poly);
        if (a > largestArea) {
          largestArea = a;
          largestIdx = i;
        }
      });
      this.centroid = polygonCentroid(this.polygons[largestIdx]);
      this.area = largestArea;
    }
  }

  /** Set ownership */
  setOwner(playerId, colorIndex) {
    this.ownerId = playerId;
    this.ownerColorIndex = colorIndex;
  }

  /** Check if this territory is neutral */
  get isNeutral() {
    return this.ownerId === null;
  }
}
