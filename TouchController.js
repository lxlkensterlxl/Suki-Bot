class SukiTouchController {
  constructor(targetElement, callbacks = {}) {
    this.target = targetElement;
    this.callbacks = callbacks; // { onTap, onHold, onDrag, onSwipe }
    
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.holdTimer = null;
    this.isDragging = false;
    this.holdThreshold = 500; // ms to trigger long press

    this.init();
  }

  init() {
    // Passive false ensures preventDefault works to block native browser actions
    this.target.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.target.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.target.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    this.target.addEventListener('touchcancel', () => this.resetTouch());
  }

  handleTouchStart(e) {
    if (e.touches.length !== 1) return; // Ignore multi-touch gestures like pinch
    const touch = e.touches[0];
    
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isDragging = false;

    // Trigger hold event after threshold
    this.holdTimer = setTimeout(() => {
      if (!this.isDragging && this.callbacks.onHold) {
        this.callbacks.onHold({ x: this.touchStartX, y: this.touchStartY });
      }
    }, this.holdThreshold);
  }

  handleTouchMove(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault(); // Stop rubber-band scrolling

    const touch = e.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // Treat as drag if moved beyond threshold (10px)
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.isDragging = true;
      clearTimeout(this.holdTimer);

      if (this.callbacks.onDrag) {
        this.callbacks.onDrag({
          x: touch.clientX,
          y: touch.clientY,
          deltaX,
          deltaY
        });
      }
    }
  }

  handleTouchEnd(e) {
    clearTimeout(this.holdTimer);

    if (e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    if (!this.isDragging) {
      // Tap detected
      if (this.callbacks.onTap) {
        this.callbacks.onTap({ x: touch.clientX, y: touch.clientY });
      }
    } else {
      // Swipe detection logic
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const swipeThreshold = 50;

      if (Math.max(absX, absY) > swipeThreshold && this.callbacks.onSwipe) {
        let direction = '';
        if (absX > absY) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }
        this.callbacks.onSwipe({ direction, deltaX, deltaY });
      }
    }

    this.resetTouch();
  }

  resetTouch() {
    clearTimeout(this.holdTimer);
    this.isDragging = false;
  }
}

// Instantiate and bind to SukiBot Canvas Wrapper
const canvasWrapper = document.getElementById('suki-canvas-wrapper');

const touchHandler = new SukiTouchController(canvasWrapper, {
  onTap: (coords) => {
    console.log('Tap triggered at', coords);
    // Trigger expression swap or tap reaction animation
  },
  onHold: (coords) => {
    console.log('Hold triggered at', coords);
    // Cycle HUD neon theme
    document.documentElement.setAttribute('data-theme', 'cyber-cyan');
  },
  onDrag: (dragData) => {
    // Map drag movement to character camera/head tracking
  },
  onSwipe: (swipe) => {
    console.log('Swipe detected:', swipe.direction);
    // Swipe left/right to toggle HUD panels
  }
});
