class SukiRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = {
      background: '#090914',
      accent: '#ff5fd2',
      accent2: '#7cf6ff',
      accent3: '#9b7bff',
      botColor: '#f6d8ff',
      trailColor: 'rgba(124, 246, 255, 0.8)',
      floorGlow: 'rgba(255, 95, 210, 0.3)',
      ...options,
    };

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

    this.resize();
    this.bindPointer();
  }

  bindPointer() {
    const canvas = this.canvas;
    
    const updateCoord = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = clientX - rect.left;
      this.mouse.y = clientY - rect.top;
      this.mouse.active = true;
    };

    canvas.addEventListener('pointermove', (event) => {
      updateCoord(event.clientX, event.clientY);
    });

    canvas.addEventListener('pointerdown', (event) => {
      updateCoord(event.clientX, event.clientY);
    });
  }

  resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = this.canvas.clientWidth || 900;
    const height = this.canvas.clientHeight || 520;

    this.canvas.width = Math.floor(width * ratio);
    this.canvas.height = Math.floor(height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  setState(partialState) {
    Object.assign(this.state, partialState);
  }

  launch() {
    if (this.running) return;
    this.running = true;
    this.lastTime = 0;
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  loop(timestamp) {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000 || 0.016, 0.033);
    this.lastTime = timestamp;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  update(dt) {
    const s = this.state;
    const logicalW = this.canvas.width / (window.devicePixelRatio || 1);
    const logicalH = this.canvas.height / (window.devicePixelRatio || 1);

    // Default to center if pointer hasn't touched canvas yet
    const targetX = this.mouse.active ? this.mouse.x : logicalW / 2;
    const targetY = this.mouse.active ? this.mouse.y : logicalH * 0.62;

    s.x += (targetX - s.x) * 0.03;
    s.y += (targetY - s.y) * 0.03;

    if (s.mood === 'move') {
      s.movement += dt * 8;
      s.energy = Math.max(0, s.energy - 12 * dt);
      s.vx = Math.sin(s.movement * 2.5) * 24;
      s.vy = Math.cos(s.movement * 3.1) * 16;
    } else if (s.mood === 'idle') {
      s.movement += dt * 3;
      s.energy = Math.min(100, s.energy + 3 * dt);
      s.vx *= 0.92;
      s.vy *= 0.92;
    } else if (s.mood === 'alert') {
      s.movement += dt * 12;
      s.alert = Math.min(1, s.alert + dt * 1.8);
      s.energy = Math.max(0, s.energy - 6 * dt);
    } else if (s.mood === 'speak') {
      s.speech = Math.min(1, s.speech + dt * 3.2);
      s.energy = Math.max(0, s.energy - 2 * dt);
    }

    s.pulse += dt * (s.mood === 'alert' ? 9 : 5);
    s.blink += dt * 1.2;
    s.direction = s.x > logicalW / 2 ? 1 : -1;

    if (s.mood === 'move') {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }

    s.x = Math.max(50, Math.min(logicalW - 50, s.x));
    s.y = Math.max(70, Math.min(logicalH - 70, s.y));
  }

  drawBackground() {
    const { ctx, canvas, options } = this;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createRadialGradient(
      w * 0.5, h * 0.5, 20,
      w * 0.5, h * 0.5, w * 0.7
    );
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
    const { ctx, canvas, state, options } = this;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    const ringX = w * 0.18;
    const ringY = h * 0.26;
    const radius = 26 + Math.sin(state.pulse) * 6;

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
    const { ctx, state, options } = this;
    const s = state;
    const x = s.x;
    const y = s.y;
    const size = s.size;
    const dir = s.direction;

    const bob = Math.sin(s.movement * 2.8) * 7;
    const tilt = Math.sin(s.movement * 3.2) * 10 * dir;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate((tilt * Math.PI) / 180);

    ctx.shadowColor = options.accent;
    ctx.shadowBlur = 22;

    ctx.fillStyle = 'rgba(178, 120, 255, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.8, size * 0.8, size * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8d9ff';
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

    ctx.fillStyle = '#a0f1ff';
    const blink = Math.sin(s.blink * 4) > 0.7 ? 0.1 : 1;
    ctx.beginPath();
    ctx.ellipse(-size * 0.14, -size * 0.05, size * 0.04, size * 0.06 * blink, 0, 0, Math.PI * 2);
    ctx.ellipse(size * 0.14, -size * 0.05, size * 0.04, size * 0.06 * blink, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ff7ad9';
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
      ctx.arc(0, 0, size * 0.78 + wave, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawTrail() {
    const { ctx, state, options } = this;
    const tailCount = 12;
    for (let i = tailCount; i > 0; i--) {
      const alpha = i / tailCount * 0.25;
      const offset = i * 6;
      ctx.fillStyle = options.trailColor.replace('0.8', String(alpha));
      ctx.beginPath();
      ctx.ellipse(
        state.x - state.direction * offset,
        state.y + Math.sin(state.movement * 2.6 + i) * 4,
        16 + i * 1.4,
        10 + i * 0.7,
        0, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }

  drawEnergyBar() {
    const { ctx, canvas, state } = this;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    const barX = w * 0.1;
    const barY = h * 0.82;
    const barW = w * 0.22;
    const barH = 16;

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(barX, barY, barW, barH);

    const fillW = (state.energy / 100) * barW;
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#7cf6ff');
    grad.addColorStop(0.6, '#ff5fd2');
    grad.addColorStop(1, '#9b7bff');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, fillW, barH);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px monospace';
    ctx.fillText('ENERGY', barX, barY - 8);
  }

  render() {
    this.drawBackground();
    this.drawEnergyRing();
    this.drawTrail();
    this.drawBot();
    this.drawEnergyBar();

    const { ctx, canvas, state } = this;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = 'bold 16px Orbitron, monospace';
    ctx.fillText('SUKI / ' + state.mood.toUpperCase(), w * 0.1, h * 0.14);

    ctx.fillStyle = 'rgba(124,246,255,0.8)';
    ctx.font = '12px monospace';
    ctx.fillText('BOT STATE: ONLINE', w * 0.1, h * 0.18);
  }
}

if (typeof window !== 'undefined') {
  window.SukiRenderer = SukiRenderer;
}
