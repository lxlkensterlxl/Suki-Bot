(() => {
  'use strict';

  const canvas = document.getElementById('suki-avatar-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    facing: 1,
    blink: 0,
    step: 0,
    pause: 0,
    width: 1,
    height: 1,
    raf: 0,
    last: 0,
    destroyed: false,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width || canvas.clientWidth || 120;
    const cssHeight = rect.height || canvas.clientHeight || 120;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    state.width = cssWidth;
    state.height = cssHeight;
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!state.x && !state.y) {
      state.x = state.targetX = cssWidth * 0.5;
      state.y = state.targetY = cssHeight * 0.62;
    } else {
      const bounds = { left: 18, right: cssWidth - 18, top: 18, bottom: cssHeight - 18 };
      state.x = clamp(state.x, bounds.left, bounds.right);
      state.y = clamp(state.y, bounds.top, bounds.bottom);
      state.targetX = clamp(state.targetX, bounds.left, bounds.right);
      state.targetY = clamp(state.targetY, bounds.top, bounds.bottom);
    }
  }

  function pickDestination() {
    if (state.destroyed || document.hidden || prefersReducedMotion) return;
    const margin = 18;
    state.targetX = margin + Math.random() * (state.width - margin * 2);
    state.targetY = margin + Math.random() * (state.height - margin * 2);
    state.facing = state.targetX < state.x ? -1 : 1;
    state.pause = 0.8 + Math.random() * 2.1;
  }

  function drawBackground() {
    ctx.clearRect(0, 0, state.width, state.height);
    const gradient = ctx.createRadialGradient(
      state.width * 0.5,
      state.height * 0.5,
      10,
      state.width * 0.5,
      state.height * 0.5,
      Math.max(state.width, state.height) * 0.8
    );
    gradient.addColorStop(0, 'rgba(103, 232, 249, 0.20)');
    gradient.addColorStop(0.45, 'rgba(28, 18, 42, 0.60)');
    gradient.addColorStop(1, 'rgba(9, 7, 18, 0.96)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    for (let i = 0; i < 24; i += 1) {
      const x = (i * 29.7) % state.width;
      const y = (i * 41.3) % state.height;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(103,232,249,0.18)';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function drawSuki(time, walking) {
    const size = Math.min(state.width, state.height) * 0.28;
    const x = state.x;
    const y = state.y + (walking ? Math.abs(Math.sin(state.step)) * 4 : Math.sin(time * 1.3) * 2);
    const blink = Math.sin(state.blink * 9) > 0.72 ? 0.25 : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(state.facing, 1);

    // shadow
    ctx.fillStyle = 'rgba(189, 0, 255, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.75, size * 0.82, size * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // ears
    ctx.fillStyle = '#f4d7ff';
    ctx.beginPath();
    ctx.moveTo(-size * 0.52, -size * 0.72);
    ctx.lineTo(-size * 0.38, -size * 1.05);
    ctx.lineTo(-size * 0.26, -size * 0.72);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(size * 0.52, -size * 0.72);
    ctx.lineTo(size * 0.38, -size * 1.05);
    ctx.lineTo(size * 0.26, -size * 0.72);
    ctx.closePath();
    ctx.fill();

    // head
    ctx.fillStyle = '#f4d7ff';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.12, size * 0.56, size * 0.64, 0, 0, Math.PI * 2);
    ctx.fill();

    // hair
    ctx.fillStyle = '#1d122c';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.46, size * 0.52, size * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // face details
    ctx.fillStyle = '#1b102d';
    ctx.beginPath();
    ctx.ellipse(-size * 0.18, -size * 0.12, size * 0.08, size * 0.12 * blink, 0, 0, Math.PI * 2);
    ctx.ellipse(size * 0.18, -size * 0.12, size * 0.08, size * 0.12 * blink, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(-size * 0.18, -size * 0.12, size * 0.04, 0, Math.PI * 2);
    ctx.arc(size * 0.18, -size * 0.12, size * 0.04, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ff5dcb';
    ctx.lineWidth = Math.max(1.5, size * 0.04);
    ctx.beginPath();
    ctx.arc(0, size * 0.05, size * 0.17, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();

    ctx.fillStyle = '#ff9de6';
    ctx.beginPath();
    ctx.arc(-size * 0.34, size * 0.18, size * 0.07, 0, Math.PI * 2);
    ctx.arc(size * 0.34, size * 0.18, size * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = '#f4d7ff';
    ctx.beginPath();
    ctx.fillRect(-size * 0.25, size * 0.42, size * 0.5, size * 0.72);
    ctx.fill();

    ctx.fillStyle = '#2c1a3d';
    ctx.fillRect(-size * 0.22, size * 0.72, size * 0.44, size * 0.22);

    // arms and legs
    ctx.strokeStyle = '#f4d7ff';
    ctx.lineWidth = Math.max(4, size * 0.09);
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, size * 0.52);
    ctx.lineTo(-size * 0.56, size * 0.9);
    ctx.moveTo(size * 0.25, size * 0.52);
    ctx.lineTo(size * 0.56, size * 0.9);
    ctx.moveTo(-size * 0.12, size * 1.12);
    ctx.lineTo(-size * 0.14, size * 1.58);
    ctx.moveTo(size * 0.12, size * 1.12);
    ctx.lineTo(size * 0.14, size * 1.58);
    ctx.stroke();

    // boots
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(-size * 0.24, size * 1.5, size * 0.18, size * 0.18);
    ctx.fillRect(size * 0.06, size * 1.5, size * 0.18, size * 0.18);

    // glow ring
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, size * 0.2, size * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function render(timeSec) {
    drawBackground();

    const dx = state.targetX - state.x;
    const dy = state.targetY - state.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 1) {
      const stepSize = Math.min(distance, 70 * (1 / 60));
      state.x += (dx / distance) * stepSize;
      state.y += (dy / distance) * stepSize;
      state.facing = dx < 0 ? -1 : 1;
      state.step += 0.16;
      state.pause = 0;
    } else {
      state.x = state.targetX;
      state.y = state.targetY;
      state.pause -= 1 / 60;
      if (state.pause <= 0) pickDestination();
    }

    state.blink += 1 / 60;
    const walking = Math.hypot(state.targetX - state.x, state.targetY - state.y) > 2;
    drawSuki(timeSec, walking);
  }

  function tick(timestamp) {
    if (state.destroyed || document.hidden || prefersReducedMotion) return;
    const dt = state.last ? Math.min((timestamp - state.last) / 1000, 0.04) : 1 / 60;
    state.last = timestamp;

    const moveFactor = Math.min(1, dt * 60);
    const dx = state.targetX - state.x;
    const dy = state.targetY - state.y;
    if (Math.hypot(dx, dy) > 2) {
      state.x += (dx / Math.hypot(dx, dy)) * 1.5 * moveFactor;
      state.y += (dy / Math.hypot(dx, dy)) * 1.5 * moveFactor;
    }

    render(timestamp / 1000);
    state.raf = requestAnimationFrame(tick);
  }

  function start() {
    resize();
    if (prefersReducedMotion) {
      render(performance.now() / 1000);
      return;
    }
    pickDestination();
    state.raf = requestAnimationFrame(tick);
  }

  function onVisibilityChange() {
    if (document.hidden) {
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;
      state.last = 0;
    } else if (!prefersReducedMotion && !state.raf) {
      pickDestination();
      state.raf = requestAnimationFrame(tick);
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  start();

  window.sukiWalk = {
    destroy() {
      state.destroyed = true;
      if (state.raf) cancelAnimationFrame(state.raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };
})();

if (window.THREE) {
  // Keep the existing Three.js version as an optional upgrade path.
  // The 2D fallback above is the reliable default and ensures graphics render on all browsers.
  if (window.sukiWalk && typeof window.sukiWalk.destroy === 'function') {
    window.sukiWalk.destroy();
  }
}
