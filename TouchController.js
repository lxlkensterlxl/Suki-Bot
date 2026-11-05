class sukitouchcontroller {
  constructor(targetelement, callbacks = {}) {
    this.target = targetelement;
    this.callbacks = callbacks; // { ontap, onhold, ondrag, onswipe }
    
    this.touchstartx = 0;
    this.touchstarty = 0;
    this.holdtimer = null;
    this.isdragging = false;
    this.holdthreshold = 500; // ms to trigger long press

    this.init();
  }

  init() {
    // passive false ensures preventdefault works to block native browser actions
    this.target.addeventlistener('touchstart', (e) => this.handletouchstart(e), { passive: false });
    this.target.addeventlistener('touchmove', (e) => this.handletouchmove(e), { passive: false });
    this.target.addeventlistener('touchend', (e) => this.handletouchend(e), { passive: false });
    this.target.addeventlistener('touchcancel', () => this.resettouch());
  }

  handletouchstart(e) {
    if (e.touches.length !== 1) return; // ignore multi-touch gestures like pinch
    const touch = e.touches[0];
    
    this.touchstartx = touch.clientx;
    this.touchstarty = touch.clienty;
    this.isdragging = false;

    // trigger hold event after threshold
    this.holdtimer = settimeout(() => {
      if (!this.isdragging && this.callbacks.onhold) {
        this.callbacks.onhold({ x: this.touchstartx, y: this.touchstarty });
      }
    }, this.holdthreshold);
  }

  handletouchmove(e) {
    if (e.touches.length !== 1) return;
    e.preventdefault(); // stop rubber-band scrolling

    const touch = e.touches[0];
    const deltax = touch.clientx - this.touchstartx;
    const deltay = touch.clienty - this.touchstarty;

    // treat as drag if moved beyond threshold (10px)
    if (math.abs(deltax) > 10 || math.abs(deltay) > 10) {
      this.isdragging = true;
      cleartimeout(this.holdtimer);

      if (this.callbacks.ondrag) {
        this.callbacks.ondrag({
          x: touch.clientx,
          y: touch.clienty,
          deltax,
          deltay
        });
      }
    }
  }

  handletouchend(e) {
    cleartimeout(this.holdtimer);

    if (e.changedtouches.length !== 1) return;
    const touch = e.changedtouches[0];
    const deltax = touch.clientx - this.touchstartx;
    const deltay = touch.clienty - this.touchstarty;

    if (!this.isdragging) {
      // tap detected
      if (this.callbacks.ontap) {
        this.callbacks.ontap({ x: touch.clientx, y: touch.clienty });
      }
    } else {
      // swipe detection logic
      const absx = math.abs(deltax);
      const absy = math.abs(deltay);
      const swipethreshold = 50;

      if (math.max(absx, absy) > swipethreshold && this.callbacks.onswipe) {
        let direction = '';
        if (absx > absy) {
          direction = deltax > 0 ? 'right' : 'left';
        } else {
          direction = deltay > 0 ? 'down' : 'up';
        }
        this.callbacks.onswipe({ direction, deltax, deltay });
      }
    }

    this.resettouch();
  }

  resettouch() {
    cleartimeout(this.holdtimer);
    this.isdragging = false;
  }
}

// instantiate and bind to sukibot canvas wrapper
const canvaswrapper = document.getelementbyid('suki-canvas-wrapper');

const touchhandler = new sukitouchcontroller(canvaswrapper, {
  ontap: (coords) => {
    console.log('tap triggered at', coords);
    // trigger expression swap or tap reaction animation
  },
  onhold: (coords) => {
    console.log('hold triggered at', coords);
    // cycle hud neon theme
    document.documentelement.setattribute('data-theme', 'cyber-cyan');
  },
  ondrag: (dragdata) => {
    // map drag movement to character camera/head tracking
  },
  onswipe: (swipe) => {
    console.log('swipe detected:', swipe.direction);
    // swipe left/right to toggle hud panels
  }
});
