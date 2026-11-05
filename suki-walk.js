(() => {
  'use strict';

  function startSukiWalk() {
    const canvas = document.getElementById('suki-avatar-canvas');
    const Renderer = window.SukiRenderer || window.sukiRenderer;
    if (!canvas || typeof Renderer !== 'function') return;

    const renderer = new Renderer(canvas, {
      background: 'transparent',
      accent: '#c084fc',
      accent2: '#67e8f9',
      botColor: '#f7eaff',
      autonomous: true,
    });

    renderer.state.size = 54;
    renderer.state.mood = 'idle';
    renderer.drawBackground = function () {
      this.ctx.clearRect(0, 0, this.width, this.height);
    };
    renderer.drawEnergyRing = function () {};
    renderer.drawEnergyBar = function () {};
    renderer.drawTrail = function () {
      if (!this.isWalking) return;
      const { ctx, state } = this;
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = this.options.accent2;
      for (let i = 1; i <= 5; i += 1) {
        ctx.beginPath();
        ctx.ellipse(
          state.x - state.direction * i * 7,
          state.y + 32,
          11 - i,
          4 - i * 0.35,
          0, 0, Math.PI * 2
        );
        ctx.fill();
      }
      ctx.restore();
    };
    renderer.render = function () {
      if (!this.ctx || !this.width || !this.height) return;
      this.drawBackground();
      this.drawTrail();
      this.drawBot();
    };

    const bounds = () => {
      const marginX = Math.min(renderer.state.size * 0.9, renderer.width * 0.35);
      const marginY = Math.min(renderer.state.size * 0.85, renderer.height * 0.38);
      return {
        minX: marginX,
        maxX: Math.max(marginX, renderer.width - marginX),
        minY: marginY,
        maxY: Math.max(marginY, renderer.height - marginY),
      };
    };

    let manualControl = false;
    let roamTimer = 0;
    let destroyed = false;
    const chooseDestination = () => {
      if (destroyed) return;
      if (!manualControl) {
        const area = bounds();
        renderer.mouse.x = area.minX + Math.random() * (area.maxX - area.minX);
        renderer.mouse.y = area.minY + Math.random() * (area.maxY - area.minY);
        renderer.mouse.active = true;
      }
      roamTimer = window.setTimeout(chooseDestination, 1800 + Math.random() * 2400);
    };

    const onPointerEnter = () => { manualControl = true; };
    const onPointerLeave = () => { manualControl = false; };
    const onKeyDown = (event) => {
      const directions = {
        ArrowLeft: [-35, 0],
        ArrowRight: [35, 0],
        ArrowUp: [0, -30],
        ArrowDown: [0, 30],
      };
      const delta = directions[event.key];
      if (!delta) return;
      event.preventDefault();
      const area = bounds();
      const currentX = renderer.mouse.active ? renderer.mouse.x : renderer.state.x;
      const currentY = renderer.mouse.active ? renderer.mouse.y : renderer.state.y;
      renderer.mouse.x = Math.max(area.minX, Math.min(area.maxX, currentX + delta[0]));
      renderer.mouse.y = Math.max(area.minY, Math.min(area.maxY, currentY + delta[1]));
      renderer.mouse.active = true;
      manualControl = true;
      window.clearTimeout(roamTimer);
      roamTimer = window.setTimeout(() => {
        manualControl = false;
        chooseDestination();
      }, 1800);
    };

    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('pointermove', onPointerEnter);
    canvas.addEventListener('pointerdown', onPointerEnter);
    renderer.isWalking = false;

    const update = renderer.update.bind(renderer);
    renderer.update = (dt) => {
      const beforeX = renderer.state.x;
      const beforeY = renderer.state.y;
      update(dt);
      renderer.isWalking = Math.hypot(renderer.state.x - beforeX, renderer.state.y - beforeY) > 0.2;
      if (renderer.isWalking) {
        renderer.state.movement += dt * 4;
        renderer.state.energy = Math.max(0, renderer.state.energy - dt * 1.5);
      } else {
        renderer.state.energy = Math.min(100, renderer.state.energy + dt * 2);
      }
    };

    renderer.launch();
    chooseDestination();

    const cleanup = () => {
      destroyed = true;
      window.clearTimeout(roamTimer);
      canvas.removeEventListener('pointerenter', onPointerEnter);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('pointermove', onPointerEnter);
      canvas.removeEventListener('pointerdown', onPointerEnter);
      renderer.destroy();
      window.removeEventListener('pagehide', cleanup);
    };
    window.addEventListener('pagehide', cleanup, { once: true });
    window.sukiWalk = { renderer, destroy: cleanup };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startSukiWalk, { once: true });
  } else {
    startSukiWalk();
  }
})();
