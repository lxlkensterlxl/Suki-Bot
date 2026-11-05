(() => {
  'use strict';

  const MOODS = new Set(['idle', 'move', 'alert', 'speak']);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  class SukiRenderer {
    constructor(canvas, options = {}) {
      if (!canvas || typeof canvas.getContext !== 'function') {
        throw new TypeError('SukiRenderer requires a canvas element.');
      }

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.options = {
        background: '#090914',
        accent: '#ff5fd2',
        accent2: '#7cf6ff',
        accent3: '#9b7bff',
        botColor: '#f6d8ff',
        trailColorBase: [124, 246, 255],
        floorGlow: 'rgba(255, 95, 210, 0.3)',
        ...options,
      };

      this.width = 1;
      this.height = 1;
      this.pixelRatio = 1;
      this.state = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 90,
        mood: 'idle',
        energy: 100,
        alert: 0,
        direction: 1,
        blink: 0,
        pulse: 0,
        movement: 0,
        speech: 0,
      };

      this.raf = null;
      this.running = false;
      this.lastTime = 0;
      this.mouse = { x: null, y: null, active: false };
      this.listeners = [];
      this.reducedMotion = Boolean(
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
      this.motionQuery = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

      this.loop = this.loop.bind(this);
      this.resize = this.resize.bind(this);
      this.handleMotionChange = this.handleMotionChange.bind(this);

      this.resize();
      this.state.x = this.width / 2;
      this.state.y = this.height * 0.62;
      this.bindEvents();
    }

    addListener(target, type, listener, options) {
      target.addEventListener(type, listener, options);
      this.listeners.push([target, type, listener, options]);
    }

    bindEvents() {
      const updatePointer = (event) => {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        this.mouse.x = (event.clientX - rect.left) * (this.width / rect.width);
        this.mouse.y = (event.clientY - rect.top) * (this.height / rect.height);
        this.mouse.active = true;
      };

      this.addListener(this.canvas, 'pointermove', updatePointer);
      this.addListener(this.canvas, 'pointerdown', updatePointer);
      this.addListener(this.canvas, 'pointerleave', () => {
        this.mouse.active = false;
      });

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(this.resize);
        this.resizeObserver.observe(this.canvas);
      } else {
        this.addListener(window, 'resize', this.resize, { passive: true });
      }

      if (this.motionQuery) {
        if (typeof this.motionQuery.addEventListener === 'function') {
          this.addListener(this.motionQuery, 'change', this.handleMotionChange);
        } else if (typeof this.motionQuery.addListener === 'function') {
          this.motionQuery.addListener(this.handleMotionChange);
          this.legacyMotionListener = true;
        }
      }
    }

    handleMotionChange(event) {
      this.reducedMotion = event.matches;
      if (this.reducedMotion) {
        if (this.raf !== null) cancelAnimationFrame(this.raf);
        this.raf = null;
        this.render();
      } else if (this.running && this.raf === null) {
        this.lastTime = performance.now();
        this.raf = requestAnimationFrame(this.loop);
      }
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const width = rect.width || this.canvas.clientWidth || 1;
      const height = rect.height || this.canvas.clientHeight || 1;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      this.width = width;
      this.height = height;
      this.pixelRatio = ratio;
      this.canvas.width = Math.max(1, Math.round(width * ratio));
      this.canvas.height = Math.max(1, Math.round(height * ratio));

      if (this.ctx) {
        this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }

      this.state.x = clamp(this.state.x, 0, this.width);
      this.state.y = clamp(this.state.y, 0, this.height);
      if (this.running && this.reducedMotion) this.render();
    }

    setState(partialState = {}) {
      if (!partialState || typeof partialState !== 'object') return;

      for (const [key, value] of Object.entries(partialState)) {
        if (!(key in this.state)) continue;
        if (key === 'mood') {
          if (MOODS.has(value)) this.state.mood = value;
        } else if (typeof value === 'number' && Number.isFinite(value)) {
          this.state[key] = key === 'energy' ? clamp(value, 0, 100) : value;
        }
      }

      if (this.reducedMotion) this.render();
    }

    launch() {
      if (this.running) return;
      this.running = true;
      this.lastTime = performance.now();
      if (this.reducedMotion) {
        this.render();
      } else {
        this.raf = requestAnimationFrame(this.loop);
      }
    }

    stop() {
      this.running = false;
      if (this.raf !== null) cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    destroy() {
      this.stop();
      if (this.resizeObserver) this.resizeObserver.disconnect();
      for (const [target, type, listener, options] of this.listeners) {
        target.removeEventListener(type, listener, options);
      }
      this.listeners.length = 0;
      if (this.legacyMotionListener && this.motionQuery) {
        this.motionQuery.removeListener(this.handleMotionChange);
      }
    }

    loop(timestamp) {
      if (!this.running || this.reducedMotion) {
        this.raf = null;
        return;
      }

      const elapsed = (timestamp - this.lastTime) / 1000;
      const dt = clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, 0.05);
      this.lastTime = timestamp;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(this.loop);
    }

    update(dt) {
      const s = this.state;
      const targetX = this.mouse.active ? this.mouse.x : this.width / 2;
      const targetY = this.mouse.active ? this.mouse.y : this.height * 0.62;
      const follow = 1 - Math.exp(-3 * dt);

      if (s.mood === 'move') {
        s.movement += dt * 8;
        s.energy = Math.max(0, s.energy - 12 * dt);
        s.vx = Math.sin(s.movement * 2.5) * 24;
        s.vy = Math.cos(s.movement * 3.1) * 16;
        s.x += (targetX + s.vx - s.x) * follow;
        s.y += (targetY + s.vy - s.y) * follow;
      } else {
        if (s.mood === 'idle') {
          s.movement += dt * 3;
          s.energy = Math.min(100, s.energy + 3 * dt);
          s.alert = Math.max(0, s.alert - dt * 2);
          s.speech = Math.max(0, s.speech - dt * 2);
        } else if (s.mood === 'alert') {
          s.movement += dt * 12;
          s.alert = Math.min(1, s.alert + dt * 1.8);
          s.energy = Math.max(0, s.energy - 6 * dt);
        } else if (s.mood === 'speak') {
          s.speech = Math.min(1, s.speech + dt * 3.2);
          s.alert = Math.max(0, s.alert - dt);
          s.energy = Math.max(0, s.energy - 2 * dt);
        }

        s.vx *= Math.pow(0.08, dt);
        s.vy *= Math.pow(0.08, dt);
        s.x += (targetX - s.x) * follow;
        s.y += (targetY - s.y) * follow;
      }

      s.pulse += dt * (s.mood === 'alert' ? 9 : 5);
      s.blink += dt * 1.2;
      s.direction = s.x > this.width / 2 ? 1 : -1;

      const marginX = Math.min(50, this.width / 2);
      const marginY = Math.min(70, this.height / 2);
      s.x = clamp(s.x, marginX, this.width - marginX);
      s.y = clamp(s.y, marginY, this.height - marginY);
    }

    drawBackground() {
      const { ctx, options } = this;
      const { width: w, height: h } = this;
      ctx.clearRect(0, 0, w, h);

      const gradient = ctx.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      gradient.addColorStop(0, 'rgba(112, 74, 168, 0.35)');
      gradient.addColorStop(0.5, 'rgba(19, 18, 30, 0.92)');
      gradient.addColorStop(1, options.background);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 60; i++) {
        const x = (i * 137.1) % w;
        const y = (i * 96.7) % h;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(124,246,255,0.35)';
        ctx.fillRect(x, y, 2, 2);
      }

      ctx.strokeStyle = 'rgba(140, 120, 255, 0.18)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 0; x < w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }

    drawEnergyRing() {
      const { ctx, state, options } = this;
      const radius = 26 + Math.sin(state.pulse) * 6;
      const ringX = this.width * 0.18;
      const ringY = this.height * 0.26;

      ctx.beginPath();
      ctx.arc(ringX, ringY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(124, 246, 255, 0.65)';
      ctx.lineWidth = 2;
      ctx.shadowColor = options.accent2;
      ctx.shadowBlur = 20;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ringX, ringY, radius * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 95, 210, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    drawBot() {
      const { ctx, state: s, options } = this;
      const { size, direction: dir } = s;
      const bob = Math.sin(s.movement * 2.8) * 7;
      const tilt = Math.sin(s.movement * 3.2) * 10 * dir;

      ctx.save();
      ctx.translate(s.x, s.y + bob);
      ctx.rotate((tilt * Math.PI) / 180);
      ctx.shadowColor = options.accent;
      ctx.shadowBlur = 22;

      ctx.fillStyle = 'rgba(178, 120, 255, 0.2)';
      ctx.beginPath();
      ctx.ellipse(0, size * 0.8, size * 0.8, size * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = options.botColor;
      ctx.beginPath();
      ctx.moveTo(-size * 0.22, -size * 0.5);
      ctx.lineTo(-size * 0.06, -size * 0.9);
      ctx.lineTo(size * 0.06, -size * 0.9);
      ctx.lineTo(size * 0.22, -size * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f5e5ff';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.38, size * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1f102d';
      ctx.beginPath();
      ctx.ellipse(-size * 0.14, -size * 0.05, size * 0.08, size * 0.12, 0, 0, Math.PI * 2);
      ctx.ellipse(size * 0.14, -size * 0.05, size * 0.08, size * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = options.accent2;
      const blink = Math.sin(s.blink * 4) > 0.7 ? 0.1 : 1;
      ctx.beginPath();
      ctx.ellipse(-size * 0.14, -size * 0.05, size * 0.04, size * 0.06 * blink, 0, 0, Math.PI * 2);
      ctx.ellipse(size * 0.14, -size * 0.05, size * 0.04, size * 0.06 * blink, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = options.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-size * 0.14, size * 0.16);
      ctx.quadraticCurveTo(0, size * 0.28, size * 0.14, size * 0.16);
      ctx.stroke();

      ctx.fillStyle = 'rgba(155, 123, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(-size * 0.5, size * 0.1, size * 0.12, 0, Math.PI * 2);
      ctx.arc(size * 0.5, size * 0.1, size * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(124,246,255,0.75)';
      ctx.beginPath();
      ctx.arc(-size * 0.5, size * 0.1, size * 0.06, 0, Math.PI * 2);
      ctx.arc(size * 0.5, size * 0.1, size * 0.06, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      if (s.mood === 'alert' || s.mood === 'speak') {
        const wave = Math.sin(s.pulse * 2.3) * 10;
        ctx.strokeStyle = 'rgba(124,246,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, size * 0.78 + wave), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawTrail() {
      const { ctx, options, state } = this;
      const tailCount = 12;
      const trailColor = Array.isArray(options.trailColorBase) ? options.trailColorBase : [124, 246, 255];
      const [r, g, b] = trailColor;

      for (let i = tailCount; i > 0; i--) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(i / tailCount) * 0.25})`;
        ctx.beginPath();
        ctx.ellipse(
          state.x - state.direction * i * 6,
          state.y + Math.sin(state.movement * 2.6 + i) * 4,
          16 + i * 1.4,
          10 + i * 0.7,
          0, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }

    drawEnergyBar() {
      const { ctx, state } = this;
      const barX = this.width * 0.1;
      const barY = this.height * 0.82;
      const barW = this.width * 0.22;
      const barH = 16;

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(barX, barY, barW, barH);
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#7cf6ff');
      grad.addColorStop(0.6, '#ff5fd2');
      grad.addColorStop(1, '#9b7bff');
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, barW * clamp(state.energy, 0, 100) / 100, barH);

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '12px monospace';
      ctx.fillText('ENERGY', barX, barY - 8);
    }

    render() {
      const { ctx, state } = this;
      if (!ctx || !this.width || !this.height) return;

      this.drawBackground();
      this.drawEnergyRing();
      this.drawTrail();
      this.drawBot();
      this.drawEnergyBar();

      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = 'bold 16px Orbitron, monospace';
      ctx.fillText(`SUKI / ${state.mood.toUpperCase()}`, this.width * 0.1, this.height * 0.14);
      ctx.fillStyle = 'rgba(124,246,255,0.8)';
      ctx.font = '12px monospace';
      ctx.fillText('BOT STATE: ONLINE', this.width * 0.1, this.height * 0.18);
    }
  }

  window.SukiRenderer = SukiRenderer;
  // Preserve the original public name for existing integrations.
  window.sukiRenderer = SukiRenderer;
})();
