(() => {
  'use strict';

  const canvas = document.getElementById('suki-avatar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const suki = {
    x: 0, y: 0, fromX: 0, fromY: 0, targetX: 0, targetY: 0,
    facing: 1, step: 0, blink: 0, pause: 0, walkDuration: 0,
  };
  let width = 1;
  let height = 1;
  let dpr = 1;
  let raf = 0;
  let lastTime = 0;
  let destroyed = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function resize() {
    const viewport = window.visualViewport;
    width = Math.max(1, viewport ? viewport.width : window.innerWidth);
    height = Math.max(1, viewport ? viewport.height : window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!suki.x) {
      suki.x = suki.fromX = suki.targetX = width * 0.5;
      suki.y = suki.fromY = suki.targetY = height * 0.64;
    } else {
      const area = movementBounds();
      suki.x = clamp(suki.x, area.left, area.right);
      suki.y = clamp(suki.y, area.top, area.bottom);
      suki.targetX = clamp(suki.targetX, area.left, area.right);
      suki.targetY = clamp(suki.targetY, area.top, area.bottom);
    }
    if (reduceMotion.matches) render(performance.now() / 1000, 0);
  }

  function movementBounds() {
    const marginX = Math.min(42, width * 0.15);
    const marginY = Math.min(64, height * 0.18);
    return {
      left: marginX,
      right: Math.max(marginX, width - marginX),
      top: marginY,
      bottom: Math.max(marginY, height - marginY),
    };
  }

  function pickDestination() {
    if (destroyed || document.hidden || reduceMotion.matches) return;
    const area = movementBounds();
    const x = area.left + Math.random() * (area.right - area.left);
    const y = area.top + Math.random() * (area.bottom - area.top);
    suki.fromX = suki.x;
    suki.fromY = suki.y;
    suki.targetX = x;
    suki.targetY = y;
    suki.facing = x < suki.x ? -1 : 1;
    suki.walkDuration = Math.max(1.2, Math.hypot(x - suki.x, y - suki.y) / 95);
    suki.pause = 1.2 + Math.random() * 2.4;
  }

  function drawBackground(time) {
    ctx.clearRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * 0.5, height * 0.52, 4, width * 0.5, height * 0.52, Math.max(width, height) * 0.72);
    glow.addColorStop(0, 'rgba(86, 49, 126, 0.33)');
    glow.addColorStop(0.55, 'rgba(30, 18, 49, 0.48)');
    glow.addColorStop(1, 'rgba(10, 7, 18, 0.95)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Slow, subtle stars keep the scene lively without competing with Suki.
    for (let i = 0; i < 48; i += 1) {
      const x = (i * 197.3) % width;
      const y = (i * 113.9) % height;
      const twinkle = 0.2 + (Math.sin(time * 0.8 + i * 1.7) + 1) * 0.22;
      ctx.fillStyle = i % 3 === 0
        ? `rgba(103, 232, 249, ${twinkle})`
        : `rgba(247, 241, 255, ${twinkle * 0.7})`;
      ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1.3, i % 5 === 0 ? 2 : 1.3);
    }

    const floorY = height * 0.83;
    const floor = ctx.createLinearGradient(0, floorY, 0, height);
    floor.addColorStop(0, 'rgba(35, 18, 56, 0)');
    floor.addColorStop(1, 'rgba(42, 20, 66, 0.4)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, floorY, width, height - floorY);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.09)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i += 1) {
      const y = floorY + i * i * 2.2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }

  function drawAura(time) {
    const pulse = reduceMotion.matches ? 0.35 : (Math.sin(time * 2.8) + 1) * 0.5;
    const auraRadius = 48 + pulse * 18;
    const aura = ctx.createRadialGradient(suki.x, suki.y - 6, 12, suki.x, suki.y - 6, auraRadius);
    aura.addColorStop(0, `rgba(103, 232, 249, ${0.12 + pulse * 0.12})`);
    aura.addColorStop(0.45, `rgba(196, 132, 252, ${0.10 + pulse * 0.09})`);
    aura.addColorStop(1, 'rgba(196, 132, 252, 0)');

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(suki.x, suki.y + 4, auraRadius * 0.75, auraRadius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(103, 232, 249, ${0.18 + pulse * 0.22})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(suki.x, suki.y, 22 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawSuki(time, walking) {
    const stride = walking ? Math.sin(suki.step) : 0;
    const bounce = walking ? Math.abs(Math.sin(suki.step)) * 4 : Math.sin(time * 1.7) * 1.5;
    const pulse = reduceMotion.matches ? 0.35 : (Math.sin(time * 2.8) + 1) * 0.5;
    const x = suki.x;
    const y = suki.y + bounce;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(suki.facing, 1);

    ctx.save();
    ctx.globalAlpha = walking ? 0.22 : 0.15;
    ctx.fillStyle = '#c084fc';
    ctx.beginPath(); ctx.ellipse(0, 41, 28, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Side ribbons and hair silhouette for a more anime-girl look.
    ctx.fillStyle = '#1d102f';
    ctx.beginPath();
    ctx.moveTo(-18, -12); ctx.quadraticCurveTo(-28, -42, -20, -56);
    ctx.quadraticCurveTo(-8, -44, -8, -20); ctx.closePath();
    ctx.moveTo(18, -12); ctx.quadraticCurveTo(28, -42, 20, -56);
    ctx.quadraticCurveTo(8, -44, 8, -20); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f4d7ff';
    ctx.beginPath();
    ctx.ellipse(0, -10, 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#140d1f';
    ctx.beginPath();
    ctx.moveTo(-18, -12); ctx.lineTo(-12, -30); ctx.lineTo(0, -26); ctx.lineTo(12, -30); ctx.lineTo(18, -12);
    ctx.quadraticCurveTo(0, 14, -18, -12); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#201132';
    ctx.beginPath();
    ctx.moveTo(-20, -28); ctx.quadraticCurveTo(-28, -10, -14, 1);
    ctx.quadraticCurveTo(-23, 2, -26, -18); ctx.closePath();
    ctx.moveTo(20, -28); ctx.quadraticCurveTo(28, -10, 14, 1);
    ctx.quadraticCurveTo(23, 2, 26, -18); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f9d8ff';
    ctx.beginPath();
    ctx.ellipse(-6, -11, 2.3, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(6, -11, 2.3, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(-6, -11, 0.9, 0, Math.PI * 2);
    ctx.arc(6, -11, 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2a1b3b';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-9, -5); ctx.lineTo(-3, -2); ctx.moveTo(9, -5); ctx.lineTo(3, -2);
    ctx.stroke();

    ctx.strokeStyle = '#e879b9';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, -3, 4.8, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(247, 168, 212, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-10, -2, 3.6, 1.4, 0, 0, Math.PI * 2);
    ctx.ellipse(10, -2, 3.6, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#6557d8';
    ctx.beginPath();
    ctx.moveTo(-13, 4); ctx.quadraticCurveTo(0, -2, 13, 4);
    ctx.lineTo(19, 27); ctx.quadraticCurveTo(0, 34, -19, 27); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath();
    ctx.moveTo(-6, 5); ctx.lineTo(0, 15); ctx.lineTo(6, 5); ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#f6d8ff';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-12, 8); ctx.lineTo(-17, 18 - stride * 4);
    ctx.moveTo(12, 8); ctx.lineTo(17, 18 + stride * 4);
    ctx.stroke();

    ctx.strokeStyle = '#6d4bd1';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-8, 24); ctx.lineTo(-9 + stride * 7, 37 + Math.max(0, stride) * 2);
    ctx.moveTo(8, 24); ctx.lineTo(9 - stride * 7, 37 + Math.max(0, -stride) * 2);
    ctx.stroke();

    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-13 + stride * 7, 38 + Math.max(0, stride) * 2); ctx.lineTo(-4 + stride * 7, 38 + Math.max(0, stride) * 2);
    ctx.moveTo(4 - stride * 7, 38 + Math.max(0, -stride) * 2); ctx.lineTo(13 - stride * 7, 38 + Math.max(0, -stride) * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(103, 232, 249, ${0.5 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 24 + pulse * 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function render(time, dt) {
    drawBackground(time);
    if (dt > 0) {
      const dx = suki.targetX - suki.x;
      const dy = suki.targetY - suki.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 1.5) {
        const speed = 105;
        const travel = Math.min(distance, speed * dt);
        suki.x += dx / distance * travel;
        suki.y += dy / distance * travel;
        suki.facing = dx < 0 ? -1 : 1;
        suki.step += dt * 10;
        suki.pause = 0;
      } else {
        suki.x = suki.targetX;
        suki.y = suki.targetY;
        suki.pause -= dt;
        if (suki.pause <= 0) pickDestination();
      }
      suki.blink = (suki.blink + dt) % 7;
    }
    const walking = Math.hypot(suki.targetX - suki.x, suki.targetY - suki.y) > 1.5;
    drawAura(time);
    drawSuki(time, walking);
  }

  function tick(timestamp) {
    if (destroyed || document.hidden || reduceMotion.matches) { raf = 0; return; }
    const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.04) : 1 / 60;
    lastTime = timestamp;
    render(timestamp / 1000, dt);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    resize();
    if (reduceMotion.matches) {
      render(performance.now() / 1000, 0);
      return;
    }
    pickDestination();
    raf = requestAnimationFrame(tick);
  }

  function onVisibilityChange() {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lastTime = 0;
    } else if (!reduceMotion.matches && !raf) {
      pickDestination();
      raf = requestAnimationFrame(tick);
    }
  }

  function onMotionChange() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastTime = 0;
    if (!reduceMotion.matches && !document.hidden) {
      pickDestination();
      raf = requestAnimationFrame(tick);
    } else {
      render(performance.now() / 1000, 0);
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  if (typeof reduceMotion.addEventListener === 'function') reduceMotion.addEventListener('change', onMotionChange);
  else if (typeof reduceMotion.addListener === 'function') reduceMotion.addListener(onMotionChange);

  start();
  window.sukiWalk = {
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (typeof reduceMotion.removeEventListener === 'function') reduceMotion.removeEventListener('change', onMotionChange);
      else if (typeof reduceMotion.removeListener === 'function') reduceMotion.removeListener(onMotionChange);
      ctx.clearRect(0, 0, width, height);
    },
  };
})();
