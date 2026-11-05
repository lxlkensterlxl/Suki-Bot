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
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#090817');
    sky.addColorStop(0.58, '#17102b');
    sky.addColorStop(1, '#080711');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * 0.5, height * 0.57, 8, width * 0.5, height * 0.57, Math.max(width, height) * 0.68);
    glow.addColorStop(0, 'rgba(58, 31, 92, 0.33)');
    glow.addColorStop(0.55, 'rgba(20, 13, 39, 0.2)');
    glow.addColorStop(1, 'rgba(8, 7, 17, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // A compact neon skyline adds a cyberpunk backdrop without external assets.
    const horizon = height * 0.78;
    for (let i = 0; i < 13; i += 1) {
      const buildingWidth = Math.max(22, width / 18);
      const x = (i * width / 11.5 - width * 0.08) % (width + buildingWidth);
      const buildingHeight = height * (0.08 + ((i * 37) % 11) / 100);
      ctx.fillStyle = i % 2 ? 'rgba(15, 12, 31, 0.8)' : 'rgba(20, 13, 39, 0.88)';
      ctx.fillRect(x, horizon - buildingHeight, buildingWidth, buildingHeight);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 75, 205, 0.55)' : 'rgba(77, 233, 255, 0.45)';
      for (let row = 0; row < 3; row += 1) {
        ctx.fillRect(x + 5, horizon - buildingHeight + 9 + row * 11, 3, 2);
        ctx.fillRect(x + buildingWidth - 10, horizon - buildingHeight + 9 + row * 11, 3, 2);
      }
    }

    // Distant neon motes.
    for (let i = 0; i < 38; i += 1) {
      const x = (i * 197.3) % width;
      const y = (i * 113.9) % (height * 0.76);
      const twinkle = 0.12 + (Math.sin(time * 0.8 + i * 1.7) + 1) * 0.18;
      ctx.fillStyle = i % 3 === 0
        ? `rgba(77, 233, 255, ${twinkle})`
        : `rgba(255, 75, 205, ${twinkle * 0.7})`;
      ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1.3, i % 5 === 0 ? 2 : 1.3);
    }

    const floorY = height * 0.83;
    const floor = ctx.createLinearGradient(0, floorY, 0, height);
    floor.addColorStop(0, 'rgba(35, 18, 56, 0)');
    floor.addColorStop(1, 'rgba(42, 20, 66, 0.4)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, floorY, width, height - floorY);
    ctx.strokeStyle = 'rgba(77, 233, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i += 1) {
      const y = floorY + i * i * 2.2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    for (let i = -8; i <= 8; i += 1) {
      ctx.beginPath(); ctx.moveTo(width / 2 + i * 18, floorY); ctx.lineTo(width / 2 + i * 56, height); ctx.stroke();
    }
  }

  function drawAura(time) {
    const pulse = reduceMotion.matches ? 0.35 : (Math.sin(time * 2.8) + 1) * 0.5;
    const auraRadius = 48 + pulse * 18;
    const aura = ctx.createRadialGradient(suki.x, suki.y - 6, 12, suki.x, suki.y - 6, auraRadius);
    aura.addColorStop(0, `rgba(77, 233, 255, ${0.12 + pulse * 0.12})`);
    aura.addColorStop(0.45, `rgba(255, 58, 196, ${0.10 + pulse * 0.09})`);
    aura.addColorStop(1, 'rgba(255, 58, 196, 0)');

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(suki.x, suki.y + 4, auraRadius * 0.75, auraRadius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(77, 233, 255, ${0.18 + pulse * 0.22})`;
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
    const blinking = !reduceMotion.matches && suki.blink > 5.9 && suki.blink < 6.12;
    const x = suki.x;
    const y = suki.y + bounce;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(suki.facing, 1);

    // Ground shadow and neon-edged silhouette.
    ctx.save();
    ctx.globalAlpha = walking ? 0.22 : 0.15;
    ctx.fillStyle = '#ff3ac4';
    ctx.beginPath(); ctx.ellipse(0, 41, 28, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Long dark hair with bright cyber-pink/cyan streaks and pointed cat-ear locks.
    ctx.fillStyle = '#111020';
    ctx.beginPath();
    ctx.moveTo(-17, -15); ctx.lineTo(-27, -43); ctx.lineTo(-12, -34);
    ctx.quadraticCurveTo(0, -43, 12, -34); ctx.lineTo(27, -43); ctx.lineTo(17, -12);
    ctx.quadraticCurveTo(27, 8, 20, 24); ctx.lineTo(11, 12);
    ctx.quadraticCurveTo(0, 22, -11, 12); ctx.lineTo(-20, 24);
    ctx.quadraticCurveTo(-27, 6, -17, -15); ctx.closePath();
    ctx.fill();

    // Neon hair streaks.
    ctx.strokeStyle = '#ff3ac4'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-16, -33); ctx.quadraticCurveTo(-19, -10, -15, 10); ctx.stroke();
    ctx.strokeStyle = '#4de9ff';
    ctx.beginPath(); ctx.moveTo(15, -32); ctx.quadraticCurveTo(19, -8, 15, 10); ctx.stroke();

    // Cat-ear headset with luminous tips.
    ctx.fillStyle = '#282340';
    ctx.beginPath();
    ctx.moveTo(-19, -29); ctx.lineTo(-25, -48); ctx.lineTo(-7, -37); ctx.closePath();
    ctx.moveTo(19, -29); ctx.lineTo(25, -48); ctx.lineTo(7, -37); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4de9ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-22, -43); ctx.lineTo(-12, -38); ctx.moveTo(22, -43); ctx.lineTo(12, -38); ctx.stroke();
    ctx.fillStyle = '#ff3ac4';
    ctx.beginPath(); ctx.arc(-20, -29, 3, 0, Math.PI * 2); ctx.arc(20, -29, 3, 0, Math.PI * 2); ctx.fill();

    // Face.
    ctx.fillStyle = '#f6d9ed';
    ctx.beginPath(); ctx.ellipse(0, -10, 15, 18, 0, 0, Math.PI * 2); ctx.fill();

    // Side locks frame the face.
    ctx.fillStyle = '#171527';
    ctx.beginPath();
    ctx.moveTo(-15, -25); ctx.quadraticCurveTo(-23, -8, -15, 5); ctx.lineTo(-11, -2); ctx.lineTo(-10, -21); ctx.closePath();
    ctx.moveTo(15, -25); ctx.quadraticCurveTo(23, -8, 15, 5); ctx.lineTo(11, -2); ctx.lineTo(10, -21); ctx.closePath();
    ctx.fill();

    // Large luminous anime eyes, with a blink that respects reduced-motion settings.
    if (blinking) {
      ctx.strokeStyle = '#241a34'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-10, -10); ctx.quadraticCurveTo(-6, -7, -2, -10); ctx.moveTo(2, -10); ctx.quadraticCurveTo(6, -7, 10, -10); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff8ff';
      ctx.beginPath(); ctx.ellipse(-6, -10, 4.1, 5.5, -0.1, 0, Math.PI * 2); ctx.ellipse(6, -10, 4.1, 5.5, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a432de';
      ctx.beginPath(); ctx.ellipse(-6, -9.5, 2.5, 4.2, 0, 0, Math.PI * 2); ctx.ellipse(6, -9.5, 2.5, 4.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4de9ff';
      ctx.beginPath(); ctx.arc(-6, -10, 1.15, 0, Math.PI * 2); ctx.arc(6, -10, 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-7, -12, 1.2, 0, Math.PI * 2); ctx.arc(5, -12, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#291b3a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-10, -16); ctx.lineTo(-3, -15); ctx.moveTo(3, -15); ctx.lineTo(10, -16); ctx.stroke();
    }

    ctx.strokeStyle = '#d85aaf'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -3, 3.8, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 90, 177, 0.55)';
    ctx.beginPath(); ctx.ellipse(-10, -3, 3, 1.3, 0, 0, Math.PI * 2); ctx.ellipse(10, -3, 3, 1.3, 0, 0, Math.PI * 2); ctx.fill();

    // Cyber jacket, luminous collar, and compact chest panel.
    ctx.fillStyle = '#29243f';
    ctx.beginPath(); ctx.moveTo(-13, 4); ctx.lineTo(-20, 27); ctx.quadraticCurveTo(0, 35, 20, 27); ctx.lineTo(13, 4); ctx.quadraticCurveTo(0, -1, -13, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff3ac4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-17, 24); ctx.lineTo(-12, 7); ctx.moveTo(17, 24); ctx.lineTo(12, 7); ctx.stroke();
    ctx.fillStyle = '#4de9ff';
    ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(0, 14); ctx.lineTo(6, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111020'; ctx.fillRect(-4, 17, 8, 5);
    ctx.fillStyle = `rgba(77, 233, 255, ${0.55 + pulse * 0.4})`; ctx.fillRect(-2, 18, 4, 2);

    // Sleeves and small luminous wrist cuffs.
    ctx.strokeStyle = '#302b49'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(-18, 19 - stride * 3); ctx.moveTo(12, 8); ctx.lineTo(18, 19 + stride * 3); ctx.stroke();
    ctx.strokeStyle = '#4de9ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-17, 17 - stride * 3); ctx.lineTo(-19, 20 - stride * 3); ctx.moveTo(17, 17 + stride * 3); ctx.lineTo(19, 20 + stride * 3); ctx.stroke();

    // Pleated techwear skirt and moving legs.
    ctx.fillStyle = '#171527';
    ctx.beginPath(); ctx.moveTo(-13, 24); ctx.lineTo(13, 24); ctx.lineTo(18, 34); ctx.lineTo(-18, 34); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff3ac4'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-10, 26); ctx.lineTo(-12, 33); ctx.moveTo(0, 26); ctx.lineTo(0, 34); ctx.moveTo(10, 26); ctx.lineTo(12, 33); ctx.stroke();
    ctx.strokeStyle = '#f6d9ed'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-7, 34); ctx.lineTo(-8 + stride * 6, 40); ctx.moveTo(7, 34); ctx.lineTo(8 - stride * 6, 40); ctx.stroke();
    ctx.strokeStyle = '#4de9ff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-12 + stride * 6, 41); ctx.lineTo(-4 + stride * 6, 41); ctx.moveTo(4 - stride * 6, 41); ctx.lineTo(12 - stride * 6, 41); ctx.stroke();

    // Neon orbit ring behind Suki's silhouette.
    ctx.strokeStyle = `rgba(77, 233, 255, ${0.45 + pulse * 0.35})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 2, 31 + pulse * 3, 43 + pulse * 3, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff3ac4';
    ctx.beginPath(); ctx.arc(-31, -15, 2, 0, Math.PI * 2); ctx.arc(31, 19, 2, 0, Math.PI * 2); ctx.fill();

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
