(() => {
  'use strict';

  class SukiTouchController {
    constructor(targetElement, callbacks = {}, options = {}) {
      if (!targetElement || typeof targetElement.addEventListener !== 'function') {
        throw new TypeError('SukiTouchController requires an event target.');
      }

      this.target = targetElement;
      this.callbacks = callbacks && typeof callbacks === 'object' ? callbacks : {};
      this.holdThreshold = Number.isFinite(options.holdThreshold)
        ? Math.max(0, options.holdThreshold)
        : 500;
      this.dragThreshold = Number.isFinite(options.dragThreshold)
        ? Math.max(0, options.dragThreshold)
        : 10;
      this.swipeThreshold = Number.isFinite(options.swipeThreshold)
        ? Math.max(0, options.swipeThreshold)
        : 50;

      this.touchStartX = 0;
      this.touchStartY = 0;
      this.touchId = null;
      this.holdTimer = null;
      this.isDragging = false;
      this.didHold = false;
      this.active = false;
      this.listeners = [];

      this.init();
    }

    addListener(type, handler, options) {
      this.target.addEventListener(type, handler, options);
      this.listeners.push([type, handler, options]);
    }

    init() {
      this.addListener('touchstart', (event) => this.handleTouchStart(event), { passive: true });
      // passive: false is required here so event.preventDefault() can block native scrolling while dragging
      this.addListener('touchmove', (event) => this.handleTouchMove(event), { passive: false });
      this.addListener('touchend', (event) => this.handleTouchEnd(event), { passive: true });
      this.addListener('touchcancel', () => this.resetTouch(), { passive: true });
    }

    findTouch(touches, identifier) {
      for (let index = 0; index < touches.length; index += 1) {
        if (touches[index].identifier === identifier) return touches[index];
      }
      return null;
    }

    handleTouchStart(event) {
      if (event.touches.length !== 1) {
        this.resetTouch();
        return;
      }

      this.resetTouch();
      const touch = event.touches[0];
      this.touchId = touch.identifier;
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.active = true;
      this.isDragging = false;
      this.didHold = false;

      this.holdTimer = window.setTimeout(() => {
        this.holdTimer = null;
        if (!this.active || this.isDragging) return;
        this.didHold = true;
        this.callCallback('onHold', { x: this.touchStartX, y: this.touchStartY });
      }, this.holdThreshold);
    }

    handleTouchMove(event) {
      if (!this.active) return;
      if (event.touches.length !== 1) {
        this.resetTouch();
        return;
      }

      const touch = this.findTouch(event.touches, this.touchId);
      if (!touch) return;

      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;
      if (!this.isDragging && Math.hypot(deltaX, deltaY) <= this.dragThreshold) return;

      this.isDragging = true;
      this.clearHoldTimer();
      if (event.cancelable) event.preventDefault();
      this.callCallback('onDrag', { x: touch.clientX, y: touch.clientY, deltaX, deltaY });
    }

    handleTouchEnd(event) {
      if (!this.active) return;
      const touch = this.findTouch(event.changedTouches, this.touchId);
      if (!touch) return;

      this.clearHoldTimer();
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;

      if (!this.isDragging && !this.didHold) {
        this.callCallback('onTap', { x: touch.clientX, y: touch.clientY });
      } else if (this.isDragging) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (Math.max(absX, absY) >= this.swipeThreshold) {
          const direction = absX > absY
            ? (deltaX > 0 ? 'right' : 'left')
            : (deltaY > 0 ? 'down' : 'up');
          this.callCallback('onSwipe', { direction, deltaX, deltaY });
        }
      }

      this.resetTouch();
    }

    callCallback(name, payload) {
      const callback = this.callbacks[name];
      if (typeof callback !== 'function') return;
      try {
        callback(payload);
      } catch (error) {
        window.setTimeout(() => { throw error; }, 0);
      }
    }

    clearHoldTimer() {
      if (this.holdTimer !== null) {
        window.clearTimeout(this.holdTimer);
        this.holdTimer = null;
      }
    }

    resetTouch() {
      this.clearHoldTimer();
      this.touchId = null;
      this.active = false;
      this.isDragging = false;
      this.didHold = false;
    }

    destroy() {
      this.resetTouch();
      for (const [type, handler, options] of this.listeners) {
        this.target.removeEventListener(type, handler, options);
      }
      this.listeners.length = 0;
    }
  }

  if (typeof window !== 'undefined') {
    window.SukiTouchController = SukiTouchController;
  }
})();
