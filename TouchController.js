class SukiTouchController {
  constructor(targetElement, callbacks = {}) {
    this.target = targetElement;
    this.callbacks = callbacks;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.holdTimer = null;
    this.isDragging = false;
    this.holdThreshold = 500;

    if (!this.target) return;
    this.init();
  }

  init() {
    this.target.addEventListener('touchstart', (event) => this.handleTouchStart(event), { passive: false });
    this.target.addEventListener('touchmove', (event) => this.handleTouchMove(event), { passive: false });
    this.target.addEventListener('touchend', (event) => this.handleTouchEnd(event), { passive: false });
    this.target.addEventListener('touchcancel', () => this.resetTouch());
  }

  handleTouchStart(event) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isDragging = false;

    this.holdTimer = setTimeout(() => {
      if (!this.isDragging && this.callbacks.onHold) {
        this.callbacks.onHold({ x: this.touchStartX, y: this.touchStartY });
      }
    }, this.holdThreshold);
  }

  handleTouchMove(event) {
    if (event.touches.length !== 1) return;
    event.preventDefault();

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.isDragging = true;
      clearTimeout(this.holdTimer);

      if (this.callbacks.onDrag) {
        this.callbacks.onDrag({ x: touch.clientX, y: touch.clientY, deltaX, deltaY });
      }
    }
  }

  handleTouchEnd(event) {
    clearTimeout(this.holdTimer);
    if (event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    if (!this.isDragging) {
      if (this.callbacks.onTap) {
        this.callbacks.onTap({ x: touch.clientX, y: touch.clientY });
      }
    } else {
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

window.SukiTouchController = SukiTouchController;
