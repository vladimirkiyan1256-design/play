/* ═══════════════════════════════════════════════════════════
   AEROWAR v2.3 — Three.js 3D Overlay
   Top-down orthographic camera with individually tilted models.
   Each model is rotated ~40° on X to show 3D depth while
   keeping perfect pixel alignment with the 2D map.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ZOOM_3D = 8;

// Camera tilt: 35° from vertical — shows front+top of models
const CAM_TILT = 0.6; // radians
const COS_TILT = Math.cos(CAM_TILT); // ~0.825 — Z compensation factor

const GLB_PATHS = {
  fighter: '/models/истребитель.glb',
  missile_projectile: '/models/ракета земля-водух.glb',
};

function mt(color, extra) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.4, ...extra });
}

/* ─── Procedural model builders ─── */
const BLD = {
  bomber(c) {
    const g = new THREE.Group(), m = mt(c);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 6), m));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 1.8), m));
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.8), m);
    t.position.set(0, 0.5, -2.8); g.add(t); return g;
  },
  helicopter(c) {
    const g = new THREE.Group(), m = mt(c);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 3), m));
    const r = new THREE.Mesh(new THREE.BoxGeometry(5, 0.05, 0.3), mt(0x666666));
    r.position.y = 0.6; g.add(r); return g;
  },
  tank(c) {
    const g = new THREE.Group(), m = mt(c);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 3.2), m));
    const tu = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.5, 8), m);
    tu.position.y = 0.6; g.add(tu);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6), m);
    b.rotation.x = Math.PI / 2; b.position.set(0, 0.6, 1.5); g.add(b);
    const tm = mt(0x333333);
    [-1, 1].forEach(s => { const tr = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 3.4), tm); tr.position.set(s * 1.1, -0.1, 0); g.add(tr); });
    return g;
  },
  infantry(c) {
    const g = new THREE.Group(), m = mt(c, { roughness: 0.7 });
    const bd = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.4), m); bd.position.y = 0.5; g.add(bd);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), m); hd.position.y = 1.25; g.add(hd);
    return g;
  },
  aa(c) {
    const g = new THREE.Group(), m = mt(c);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 2.5), m));
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 8), mt(0x888888));
    d.position.set(0.5, 0.8, -0.5); d.rotation.x = 0.7; g.add(d);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.5), m);
    l.position.set(-0.3, 0.6, 0.5); l.rotation.x = -0.3; g.add(l); return g;
  },
  ship(c) {
    const g = new THREE.Group(), m = mt(c);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 6), m));
    const tw = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1.2), m); tw.position.set(0, 0.6, -0.5); g.add(tw);
    return g;
  },
  submarine(c) {
    const g = new THREE.Group(), m = mt(c);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 4, 4, 8), m); b.rotation.z = Math.PI / 2; g.add(b);
    return g;
  },
  missile(c) {
    const g = new THREE.Group(), m = mt(c);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 3), m));
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 6), mt(0x555555));
      t.rotation.x = -0.4; t.position.set((i - 1.5) * 0.3, 0.6, 0.3); g.add(t);
    }
    return g;
  },
  building(c) {
    const g = new THREE.Group(), m = mt(c, { roughness: 0.5 });
    g.add(new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 3), m));
    const r = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.5, 4), m);
    r.position.y = 2; r.rotation.y = Math.PI / 4; g.add(r); return g;
  },
};

const UNIT_TYPE = {
  fighter: 'fighter', bomber: 'bomber', helicopter: 'helicopter', awacs: 'bomber',
  attacker: 'fighter', aircraft: 'fighter',
  tank: 'tank', infantry: 'infantry', apc: 'tank', specops: 'infantry',
  sniper: 'infantry', airborne: 'infantry', marine: 'infantry', engineer: 'infantry',
  aa: 'aa', ship: 'ship', submarine: 'submarine', carrier: 'ship',
  cruiser: 'ship', destroyer: 'ship', corvette: 'ship', missile: 'missile',
};
const BLDG_TYPE = { hq: 'building', airfield: 'building', barracks: 'building', shipyard: 'building', outpost: 'building', radar: 'aa', warehouse: 'building', repair: 'building' };
const GLB_SET = new Set(['fighter', 'attacker', 'aircraft']);
const CLR = [0x00e5ff, 0xff1744, 0x00e676, 0xff6d00, 0xd500f9, 0xffea00, 0x2979ff, 0xff9100];

export default class ThreeOverlay {
  constructor() {
    this.active = false;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.units = new Map();
    this.bldgs = new Map();
    this._glb = new Map();
    this._loader = new GLTFLoader();
    this._projs = [];
  }

  async init() {
    const cv = document.createElement('canvas');
    cv.id = 'three-canvas';
    cv.style.cssText = 'position:absolute;inset:0;z-index:650;pointer-events:none;';
    document.body.appendChild(cv);

    this.renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    // Tilted orthographic camera — 35° from vertical for 3D depth
    const w = window.innerWidth, h = window.innerHeight;
    this.camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, -2000, 4000);
    // Position above and behind, looking at origin
    this.camera.position.set(0, 500 * Math.cos(CAM_TILT), 500 * Math.sin(CAM_TILT));
    this.camera.lookAt(0, 0, 0);

    // Strong directional light from front-top for 3D shading
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(200, 500, 400);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x6688cc, 0.5);
    fill.position.set(-300, 400, -200);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffeedd, 0.3);
    rim.position.set(0, 200, -500);
    this.scene.add(rim);

    window.addEventListener('resize', () => {
      const nw = window.innerWidth, nh = window.innerHeight;
      this.renderer.setSize(nw, nh);
      this.camera.left = -nw / 2; this.camera.right = nw / 2;
      this.camera.top = nh / 2; this.camera.bottom = -nh / 2;
      this.camera.updateProjectionMatrix();
    });

    await this._preload();
    this.active = true;
  }

  async _preload() {
    await Promise.allSettled(Object.entries(GLB_PATHS).map(([k, p]) =>
      new Promise((res, rej) => {
        this._loader.load(p, gltf => {
          const s = gltf.scene;
          const box = new THREE.Box3().setFromObject(s);
          const sz = new THREE.Vector3(); box.getSize(sz);
          const mx = Math.max(sz.x, sz.y, sz.z);
          if (mx > 0) s.scale.multiplyScalar(4 / mx);
          const ct = new THREE.Vector3(); box.getCenter(ct);
          s.position.sub(ct.multiplyScalar(s.scale.x));
          this._glb.set(k, s);
          console.log(`[3D] ✅ ${k}`); res();
        }, undefined, rej);
      }).catch(e => console.warn(`[3D] ✗ ${k}`, e))
    ));
  }

  _cloneGLB(key, ci) {
    const p = this._glb.get(key); if (!p) return null;
    const c = p.clone();
    const clr = new THREE.Color(CLR[ci % CLR.length]);
    c.traverse(ch => {
      if (ch.isMesh && ch.material) {
        ch.material = ch.material.clone();
        ch.material.color.lerp(clr, 0.35);
        ch.material.emissive = clr.clone().multiplyScalar(0.12);
      }
    });
    const g = new THREE.Group(); g.add(c); return g;
  }

  isActiveAtZoom(z) { return z >= ZOOM_3D; }

  update(leafletMap, unitList, buildingList, animations) {
    if (!this.active) return;
    const zoom = leafletMap.map.getZoom();
    const show = zoom >= ZOOM_3D;
    this.renderer.domElement.style.display = show ? 'block' : 'none';
    if (!show) return;

    const w = window.innerWidth, h = window.innerHeight;
    this.camera.left = -w / 2; this.camera.right = w / 2;
    this.camera.top = h / 2; this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();

    // Scale: grows with zoom, tuned so models are visible but proportional
    const sc = Math.pow(2, zoom - ZOOM_3D) * 12;
    const usedU = new Set(), usedB = new Set();

    // ── Render units ──
    for (const u of unitList) {
      usedU.add(u.id);
      const pt = leafletMap.map.latLngToContainerPoint([u.lat, u.lng]);
      if (pt.x < -120 || pt.x > w + 120 || pt.y < -120 || pt.y > h + 120) {
        const m = this.units.get(u.id); if (m) m.visible = false; continue;
      }

      let wrap = this.units.get(u.id);
      if (!wrap) {
        const inner = this._makeUnit(u.type, u.colorIndex);
        wrap = new THREE.Group();
        wrap.add(inner);
        wrap.userData.inner = inner;
        // Label
        const lbl = this._label(u.name);
        lbl.position.y = 8;
        wrap.add(lbl);
        this.scene.add(wrap);
        this.units.set(u.id, wrap);
      }

      wrap.visible = true;
      // Screen pixel → world: X direct, Z compensated for camera tilt
      wrap.position.set(pt.x - w / 2, 0, (pt.y - h / 2) / COS_TILT);
      wrap.scale.setScalar(sc);

      // Air units float up
      if (u.domain === 'air') wrap.position.y = sc * 5;

      // Face movement direction (rotate wrapper on Y, keep tilt on inner)
      if (u.targetLat != null && u.targetLng != null) {
        const tp = leafletMap.map.latLngToContainerPoint([u.targetLat, u.targetLng]);
        wrap.rotation.y = -Math.atan2(tp.x - pt.x, tp.y - pt.y);
      } else {
        wrap.rotation.y = 0;
      }
    }

    // ── Render buildings ──
    for (const b of buildingList) {
      const bid = `${b.lat.toFixed(3)}_${b.lng.toFixed(3)}`;
      usedB.add(bid);
      const pt = leafletMap.map.latLngToContainerPoint([b.lat, b.lng]);
      if (pt.x < -120 || pt.x > w + 120 || pt.y < -120 || pt.y > h + 120) {
        const m = this.bldgs.get(bid); if (m) m.visible = false; continue;
      }

      let wrap = this.bldgs.get(bid);
      if (!wrap) {
        const bk = BLDG_TYPE[b.type] || 'building';
        const clr = CLR[b.colorIndex % CLR.length];
        const inner = BLD[bk] ? BLD[bk](clr) : BLD.building(clr);
        wrap = new THREE.Group();
        wrap.add(inner);
        const lbl = this._label(b.name);
        lbl.position.y = 10;
        wrap.add(lbl);
        this.scene.add(wrap);
        this.bldgs.set(bid, wrap);
      }

      wrap.visible = true;
      wrap.position.set(pt.x - w / 2, 0, (pt.y - h / 2) / COS_TILT);
      wrap.scale.setScalar(sc * 1.5);
    }

    // Cleanup
    for (const [id, m] of this.units) if (!usedU.has(id)) { this.scene.remove(m); this.units.delete(id); }
    for (const [id, m] of this.bldgs) if (!usedB.has(id)) { this.scene.remove(m); this.bldgs.delete(id); }

    this._tickProj(leafletMap, animations || [], w, h, sc);
    this.renderer.render(this.scene, this.camera);
  }

  _makeUnit(type, ci) {
    const k = UNIT_TYPE[type] || 'infantry';
    if (GLB_SET.has(type) && this._glb.has('fighter')) {
      const g = this._cloneGLB('fighter', ci); if (g) return g;
    }
    return BLD[k] ? BLD[k](CLR[ci % CLR.length]) : BLD.infantry(CLR[ci % CLR.length]);
  }

  _label(text) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const cx = cv.getContext('2d');
    cx.font = 'bold 24px Rajdhani, sans-serif';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillStyle = 'rgba(0,0,0,0.6)';
    if (cx.roundRect) { cx.roundRect(20, 12, 216, 40, 8); cx.fill(); }
    else { cx.fillRect(20, 12, 216, 40); }
    cx.fillStyle = '#fff';
    cx.fillText(text, 128, 32);
    const tx = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false }));
    sp.scale.set(10, 2.5, 1);
    return sp;
  }

  _tickProj(map, anims, w, h, sc) {
    const now = Date.now();
    for (const a of anims) {
      if (a.type !== 'missile') continue;
      const id = `p_${a.startTime}`;
      if (this._projs.some(p => p.id === id)) continue;
      let mdl = this._glb.has('missile_projectile') ? this._cloneGLB('missile_projectile', 0) : null;
      if (!mdl) {
        mdl = new THREE.Group();
        mdl.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.5, 6), mt(0xff4400, { emissive: 0xff2200, emissiveIntensity: 0.5 })));
      }
      // no individual tilt needed — camera handles it
      const wr = new THREE.Group(); wr.add(mdl);
      this.scene.add(wr);
      this._projs.push({ id, wr, ...a });
    }
    for (let i = this._projs.length - 1; i >= 0; i--) {
      const p = this._projs[i];
      const t = Math.min((now - p.startTime) / p.duration, 1);
      if (t >= 1) { this.scene.remove(p.wr); this._projs.splice(i, 1); continue; }
      const lat = p.fromLat + (p.toLat - p.fromLat) * t;
      const lng = p.fromLng + (p.toLng - p.fromLng) * t;
      const pt = map.map.latLngToContainerPoint([lat, lng]);
      p.wr.position.set(pt.x - w / 2, Math.sin(t * Math.PI) * 30 * sc, (pt.y - h / 2) / COS_TILT);
      p.wr.scale.setScalar(sc);
    }
  }

  dispose() {
    this.renderer?.dispose(); this.renderer?.domElement.remove();
    this.units.clear(); this.bldgs.clear(); this._glb.clear();
    this._projs.forEach(p => this.scene?.remove(p.wr)); this._projs = [];
    this.active = false;
  }
}
