/* ═══════════════════════════════════════════════════════════
   AEROWAR — Input Manager (Mouse / Keyboard / Touch)
   ═══════════════════════════════════════════════════════════ */

export default class InputManager {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;

    /** Current mouse position in screen coords */
    this.mouseX = 0;
    this.mouseY = 0;

    /** Pending click to be consumed by game logic */
    this._pendingClick = null;
    /** Pending right-click */
    this._pendingRightClick = null;

    /** Track drag distance to distinguish click from pan */
    this._mouseDownPos = null;
    this._hasDragged = false;

    this._bind();
  }

  _bind() {
    const c = this.canvas;

    // Mouse move
    c.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      if (this._mouseDownPos) {
        const dx = e.clientX - this._mouseDownPos.x;
        const dy = e.clientY - this._mouseDownPos.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          this._hasDragged = true;
        }
      }

      this.camera.moveDrag(e.clientX, e.clientY);
    });

    // Mouse down
    c.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left
        this._mouseDownPos = { x: e.clientX, y: e.clientY };
        this._hasDragged = false;
        this.camera.startDrag(e.clientX, e.clientY);
      }
    });

    // Mouse up
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.camera.endDrag();
        // If we didn't drag far → it's a click
        if (!this._hasDragged && this._mouseDownPos) {
          this._pendingClick = { x: e.clientX, y: e.clientY };
        }
        this._mouseDownPos = null;
      }
    });

    // Right click
    c.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._pendingRightClick = { x: e.clientX, y: e.clientY };
    });

    // Wheel zoom
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.handleZoom(e.deltaY, e.clientX, e.clientY);
    }, { passive: false });

    // Touch (basic support)
    let lastTouchDist = 0;
    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this._mouseDownPos = { x: t.clientX, y: t.clientY };
        this._hasDragged = false;
        this.camera.startDrag(t.clientX, t.clientY);
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        lastTouchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      }
    }, { passive: true });

    c.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.mouseX = t.clientX;
        this.mouseY = t.clientY;
        this._hasDragged = true;
        this.camera.moveDrag(t.clientX, t.clientY);
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        const d = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const delta = (lastTouchDist - d) * 3;
        const cx = (t1.clientX + t2.clientX) / 2;
        const cy = (t1.clientY + t2.clientY) / 2;
        this.camera.handleZoom(delta, cx, cy);
        lastTouchDist = d;
      }
    }, { passive: false });

    c.addEventListener('touchend', (e) => {
      this.camera.endDrag();
      if (!this._hasDragged && this._mouseDownPos) {
        this._pendingClick = { ...this._mouseDownPos };
      }
      this._mouseDownPos = null;
    }, { passive: true });

    // Keyboard
    this._keys = new Set();
    window.addEventListener('keydown', (e) => this._keys.add(e.code));
    window.addEventListener('keyup', (e) => this._keys.delete(e.code));
  }

  /** Consume a pending left-click if any */
  consumeClick() {
    const c = this._pendingClick;
    this._pendingClick = null;
    return c;
  }

  /** Consume a pending right-click if any */
  consumeRightClick() {
    const c = this._pendingRightClick;
    this._pendingRightClick = null;
    return c;
  }

  /** Check if a key is currently held */
  isKeyDown(code) {
    return this._keys.has(code);
  }
}
