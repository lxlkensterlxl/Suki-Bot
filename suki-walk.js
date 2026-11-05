(() => {
  'use strict';

  const canvas = document.getElementById('suki-avatar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const suki = { x: 0, y: 0, targetX: 0, targetY: 0, facing: 1, step: 0, blink: 0, pause: 0 };
  let width = 1;
  let height = 1;
  let raf = 0;
  let lastTime = 0;
  let destroyed = false;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function resize() {
    const viewport = window.visualViewport;
    width = Math.max(1, viewport ? viewport.width : window.innerWidth);
    height = Math.max(1, viewport ? viewport.height : window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!suki.x) {
      suki.x = suki.targetX = width * 0.5;
      suki.y = suki.targetY = height * 0.64;
    } else {
      const bounds = movementBounds();
      suki.x = clamp(suki.x, bounds.left, bounds.right);
      suki.y = clamp(suki.y, bounds.top, bounds.bottom);
      suki.targetX = clamp(suki.targetX, bounds.left, bounds.right);
      suki.targetY = clamp(suki.targetY, bounds.top, bounds.bottom);
    }
    if (reduceMotion.matches) render(performance.now() / 1000, 0);
  }

  function movementBounds() {
    const marginX = Math.min(42, width * 0.15);
    const marginY = Math.min(64, height * 0.18);
    return { left: marginX, right: Math.max(marginX, width - marginX), top: marginY, bottom: Math.max(marginY, height - marginY) };
  }

  function pickDestination() {
    if (destroyed || document.hidden || reduceMotion.matches) return;
    const b = movementBounds();
    suki.targetX = b.left + Math.random() * (b.right - b.left);
    suki.targetY = b.top + Math.random() * (b.bottom - b.top);
    suki.facing = suki.targetX < suki.x ? -1 : 1;
    suki.pause = 1.2 + Math.random() * 2.4;
  }

  function drawBackground(time) {
    ctx.clearRect(0, 0, width, height);
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#070812'); sky.addColorStop(0.65, '#151025'); sky.addColorStop(1, '#080711');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);

    const horizon = height * 0.78;
    for (let i = 0; i < 13; i += 1) {
      const bw = Math.max(22, width / 18);
      const x = (i * width / 11.5 - width * 0.08) % (width + bw);
      const bh = height * (0.08 + ((i * 37) % 11) / 100);
      ctx.fillStyle = i % 2 ? 'rgba(15,12,31,.85)' : 'rgba(20,13,39,.9)';
      ctx.fillRect(x, horizon - bh, bw, bh);
      ctx.fillStyle = i % 3 ? 'rgba(77,233,255,.55)' : 'rgba(255,58,196,.65)';
      for (let row = 0; row < 3; row += 1) {
        ctx.fillRect(x + 5, horizon - bh + 9 + row * 11, 3, 2);
        ctx.fillRect(x + bw - 10, horizon - bh + 9 + row * 11, 3, 2);
      }
    }

    // Falling fragments evoke encrypted terminal output in the distant city.
    ctx.font = '10px monospace';
    for (let i = 0; i < 24; i += 1) {
      const x = (i * 71.7) % width;
      const speed = 16 + (i % 5) * 7;
      const y = (i * 53 + time * speed) % Math.max(1, horizon);
      ctx.fillStyle = i % 2 ? 'rgba(77,233,255,.22)' : 'rgba(255,58,196,.2)';
      ctx.fillText(i % 3 ? '01' : '//', x, y);
    }
    ctx.strokeStyle = 'rgba(77,233,255,.12)'; ctx.lineWidth = 1;
    for (let i = 0; i < 7; i += 1) {
      const y = height * 0.83 + i * i * 2.2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    for (let i = -8; i <= 8; i += 1) {
      ctx.beginPath(); ctx.moveTo(width / 2 + i * 18, horizon); ctx.lineTo(width / 2 + i * 56, height); ctx.stroke();
    }
  }

  function drawAura(time) {
    const pulse = reduceMotion.matches ? 0.4 : (Math.sin(time * 3) + 1) / 2;
    const radius = 52 + pulse * 18;
    const g = ctx.createRadialGradient(suki.x, suki.y - 5, 10, suki.x, suki.y - 5, radius);
    g.addColorStop(0, `rgba(77,233,255,${0.13 + pulse * 0.12})`);
    g.addColorStop(0.5, `rgba(255,58,196,${0.1 + pulse * 0.1})`);
    g.addColorStop(1, 'rgba(255,58,196,0)');
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(suki.x, suki.y, radius * 0.72, radius, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  function drawHackerHUD(time) {
    const pulse = reduceMotion.matches ? 0.5 : (Math.sin(time * 3.4) + 1) / 2;
    ctx.save();
    ctx.strokeStyle = `rgba(77,233,255,${0.35 + pulse * 0.35})`;
    ctx.fillStyle = 'rgba(77,233,255,.72)';
    ctx.lineWidth = 1;
    // Floating diagnostic brackets and tiny terminal readouts.
    const x = suki.x + 43;
    const y = suki.y - 34;
    ctx.strokeRect(x, y, 42, 27);
    ctx.beginPath(); ctx.moveTo(x + 5, y + 7); ctx.lineTo(x + 26, y + 7); ctx.moveTo(x + 5, y + 13); ctx.lineTo(x + 34, y + 13); ctx.moveTo(x + 5, y + 19); ctx.lineTo(x + 19, y + 19); ctx.stroke();
    ctx.font = '7px monospace'; ctx.fillText('TRACE: ON', x + 3, y - 4);
    ctx.strokeStyle = `rgba(255,58,196,${0.35 + pulse * 0.3})`;
    ctx.beginPath(); ctx.moveTo(suki.x - 42, suki.y - 15); ctx.lineTo(suki.x - 54, suki.y - 15); ctx.lineTo(suki.x - 54, suki.y + 8); ctx.stroke();
    ctx.fillStyle = '#ff3ac4'; ctx.fillRect(suki.x - 57, suki.y + 7, 5, 2);
    ctx.restore();
  }

  function drawSuki(time, walking) {
    const stride = walking ? Math.sin(suki.step) : 0;
    const bounce = walking ? Math.abs(Math.sin(suki.step)) * 3 : Math.sin(time * 1.7) * 1.2;
    const pulse = reduceMotion.matches ? 0.4 : (Math.sin(time * 3) + 1) / 2;
    const blinking = !reduceMotion.matches && suki.blink > 5.9 && suki.blink < 6.12;
    ctx.save(); ctx.translate(suki.x, suki.y + bounce); ctx.scale(suki.facing, 1);

    // Hood and long, asymmetric hair.
    ctx.fillStyle = '#171525';
    ctx.beginPath(); ctx.moveTo(-18, -17); ctx.lineTo(-29, -42); ctx.lineTo(-13, -35); ctx.quadraticCurveTo(0, -46, 13, -35); ctx.lineTo(29, -42); ctx.lineTo(18, -13); ctx.quadraticCurveTo(29, 9, 20, 25); ctx.lineTo(10, 11); ctx.quadraticCurveTo(0, 19, -11, 10); ctx.lineTo(-21, 25); ctx.quadraticCurveTo(-28, 4, -18, -17); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff3ac4'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-16, -33); ctx.quadraticCurveTo(-20, -8, -15, 11); ctx.stroke();
    ctx.strokeStyle = '#4de9ff'; ctx.beginPath(); ctx.moveTo(15, -33); ctx.quadraticCurveTo(19, -8, 15, 11); ctx.stroke();

    // Raised cyber hood with a high collar.
    ctx.fillStyle = '#252239'; ctx.beginPath(); ctx.moveTo(-18, -26); ctx.quadraticCurveTo(-24, -45, 0, -47); ctx.quadraticCurveTo(24, -45, 18, -26); ctx.lineTo(12, -16); ctx.lineTo(-12, -16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4de9ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -31, 15, Math.PI, Math.PI * 2); ctx.stroke();

    // Face and sharp, confident expression.
    ctx.fillStyle = '#f4d6e8'; ctx.beginPath(); ctx.ellipse(0, -10, 14, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#171525'; ctx.beginPath();
    ctx.moveTo(-14, -25); ctx.quadraticCurveTo(-24, -8, -15, 5); ctx.lineTo(-10, -2); ctx.lineTo(-10, -20); ctx.closePath();
    ctx.moveTo(14, -25); ctx.quadraticCurveTo(24, -8, 15, 5); ctx.lineTo(10, -2); ctx.lineTo(10, -20); ctx.closePath(); ctx.fill();

    if (blinking) {
      ctx.strokeStyle = '#241a34'; ctx.lineWidth = 2.2; ctx.beginPath();
      ctx.moveTo(-10, -10); ctx.lineTo(-3, -8); ctx.moveTo(3, -8); ctx.lineTo(10, -10); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff8ff'; ctx.beginPath(); ctx.ellipse(-6, -10, 4, 5, 0, 0, Math.PI * 2); ctx.ellipse(6, -10, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a432de'; ctx.beginPath(); ctx.ellipse(-6, -9.5, 2.4, 4, 0, 0, Math.PI * 2); ctx.ellipse(6, -9.5, 2.4, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4de9ff'; ctx.beginPath(); ctx.arc(-6, -10, 1.1, 0, Math.PI * 2); ctx.arc(6, -10, 1.1, 0, Math.PI * 2); ctx.fill();
      // Angled eyebrows give her a focused, formidable hacker look.
      ctx.strokeStyle = '#20192f'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-11, -17); ctx.lineTo(-3, -14); ctx.moveTo(3, -14); ctx.lineTo(11, -17); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-7, -12, 1, 0, Math.PI * 2); ctx.arc(5, -12, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#a83d87'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(2, -2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,58,196,.55)'; ctx.beginPath(); ctx.ellipse(-10, -3, 2.8, 1.2, 0, 0, Math.PI * 2); ctx.ellipse(10, -3, 2.8, 1.2, 0, 0, Math.PI * 2); ctx.fill();

    // Headset mic, ear module, and a narrow neon visor lens.
    ctx.strokeStyle = '#4de9ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -10, 17, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = '#ff3ac4'; ctx.fillRect(-18, -14, 4, 9);
    ctx.strokeStyle = '#4de9ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-16, -5); ctx.quadraticCurveTo(-12, 2, -4, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(77,233,255,.22)'; ctx.fillRect(3, -19, 9, 2);

    // Tactical hacker jacket, luminous piping, and access-card display.
    ctx.fillStyle = '#29243f'; ctx.beginPath(); ctx.moveTo(-13, 4); ctx.lineTo(-20, 27); ctx.quadraticCurveTo(0, 35, 20, 27); ctx.lineTo(13, 4); ctx.quadraticCurveTo(0, -1, -13, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff3ac4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-17, 25); ctx.lineTo(-12, 7); ctx.moveTo(17, 25); ctx.lineTo(12, 7); ctx.stroke();
    ctx.fillStyle = '#10101c'; ctx.fillRect(-5, 15, 10, 8);
    ctx.fillStyle = `rgba(77,233,255,${0.55 + pulse * 0.4})`; ctx.fillRect(-3, 17, 6, 1.5);
    ctx.fillStyle = '#ff3ac4'; ctx.fillRect(-3, 20, 4, 1);

    // Gloved arms and bright wrist interfaces.
    ctx.strokeStyle = '#171525'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(-12, 8); ctx.lineTo(-18, 19 - stride * 3); ctx.moveTo(12, 8); ctx.lineTo(18, 19 + stride * 3); ctx.stroke();
    ctx.strokeStyle = '#4de9ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-17, 18 - stride * 3); ctx.lineTo(-20, 21 - stride * 3); ctx.moveTo(17, 18 + stride * 3); ctx.lineTo(20, 21 + stride * 3); ctx.stroke();

    // Utility belt, techwear skirt, and boots.
    ctx.fillStyle = '#171525'; ctx.beginPath(); ctx.moveTo(-13, 24); ctx.lineTo(13, 24); ctx.lineTo(18, 34); ctx.lineTo(-18, 34); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff3ac4'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, 26); ctx.lineTo(-12, 33); ctx.moveTo(0, 26); ctx.lineTo(0, 34); ctx.moveTo(10, 26); ctx.lineTo(12, 33); ctx.stroke();
    ctx.fillStyle = '#4de9ff'; ctx.fillRect(10, 25, 5, 3);
    ctx.strokeStyle = '#f4d6e8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-7, 34); ctx.lineTo(-8 + stride * 6, 40); ctx.moveTo(7, 34); ctx.lineTo(8 - stride * 6, 40); ctx.stroke();
    ctx.strokeStyle = '#4de9ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-12 + stride * 6, 41); ctx.lineTo(-4 + stride * 6, 41); ctx.moveTo(4 - stride * 6, 41); ctx.lineTo(12 - stride * 6, 41); ctx.stroke();

    // Dynamic targeting reticle.
    ctx.strokeStyle = `rgba(77,233,255,${0.38 + pulse * 0.35})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, 29 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff3ac4'; ctx.beginPath(); ctx.arc(-30, -14, 2, 0, Math.PI * 2); ctx.arc(30, 17, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function render(time, dt) {
    drawBackground(time);
    if (dt > 0) {
      const dx = suki.targetX - suki.x;
      const dy = suki.targetY - suki.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 1.5) {
        const travel = Math.min(distance, 105 * dt);
        suki.x += dx / distance * travel; suki.y += dy / distance * travel;
        suki.facing = dx < 0 ? -1 : 1; suki.step += dt * 10; suki.pause = 0;
      } else {
        suki.x = suki.targetX; suki.y = suki.targetY; suki.pause -= dt;
        if (suki.pause <= 0) pickDestination();
      }
      suki.blink = (suki.blink + dt) % 7;
    }
    const walking = Math.hypot(suki.targetX - suki.x, suki.targetY - suki.y) > 1.5;
    drawAura(time); drawHackerHUD(time); drawSuki(time, walking);
  }

  function tick(timestamp) {
    if (destroyed || document.hidden || reduceMotion.matches) { raf = 0; return; }
    const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.04) : 1 / 60;
    lastTime = timestamp; render(timestamp / 1000, dt); raf = requestAnimationFrame(tick);
  }

  function start() {
    resize();
    if (reduceMotion.matches) { render(performance.now() / 1000, 0); return; }
    pickDestination(); raf = requestAnimationFrame(tick);
  }
  function onVisibilityChange() {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; lastTime = 0; }
    else if (!reduceMotion.matches && !raf) { pickDestination(); raf = requestAnimationFrame(tick); }
  }
  function onMotionChange() {
    if (raf) cancelAnimationFrame(raf); raf = 0; lastTime = 0;
    if (!reduceMotion.matches && !document.hidden) { pickDestination(); raf = requestAnimationFrame(tick); }
    else render(performance.now() / 1000, 0);
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
