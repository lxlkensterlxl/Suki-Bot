(() => {
  'use strict';

  const canvas = document.getElementById('suki-avatar-canvas');
  if (!canvas) return;

  if (!window.THREE) {
    const fallback = canvas.getContext('2d');
    if (!fallback) return;
    const legacy = (() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const suki = { x: 0, y: 0, targetX: 0, targetY: 0, facing: 1, step: 0, blink: 0, pause: 0 };
      let width = 1; let height = 1; let raf = 0; let lastTime = 0; let destroyed = false;
      const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

      function resize() {
        const viewport = window.visualViewport;
        width = Math.max(1, viewport ? viewport.width : window.innerWidth);
        height = Math.max(1, viewport ? viewport.height : window.innerHeight);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        fallback.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!suki.x) {
          suki.x = suki.targetX = width * 0.5;
          suki.y = suki.targetY = height * 0.64;
        } else {
          const b = { left: 24, right: width - 24, top: 36, bottom: height - 36 };
          suki.x = clamp(suki.x, b.left, b.right);
          suki.y = clamp(suki.y, b.top, b.bottom);
          suki.targetX = clamp(suki.targetX, b.left, b.right);
          suki.targetY = clamp(suki.targetY, b.top, b.bottom);
        }
      }

      function pickDestination() {
        if (destroyed || document.hidden || reduceMotion.matches) return;
        suki.targetX = 24 + Math.random() * (width - 48);
        suki.targetY = 36 + Math.random() * (height - 72);
        suki.facing = suki.targetX < suki.x ? -1 : 1;
        suki.pause = 1.2 + Math.random() * 2.4;
      }

      function drawBackground(time) {
        fallback.clearRect(0, 0, width, height);
        const sky = fallback.createRadialGradient(width * 0.5, height * 0.5, 20, width * 0.5, height * 0.5, Math.max(width, height));
        sky.addColorStop(0, 'rgba(86, 49, 126, 0.3)');
        sky.addColorStop(1, 'rgba(9, 7, 18, 1)');
        fallback.fillStyle = sky; fallback.fillRect(0, 0, width, height);
      }

      function drawSuki(time, walking) {
        const stride = walking ? Math.sin(suki.step) : 0;
        const bounce = walking ? Math.abs(Math.sin(suki.step)) * 4 : Math.sin(time * 1.7) * 1.5;
        const x = suki.x; const y = suki.y + bounce;
        fallback.save(); fallback.translate(x, y); fallback.scale(suki.facing, 1);
        fallback.fillStyle = 'rgba(158,109,255,.2)'; fallback.beginPath(); fallback.ellipse(0, 30, 22, 5, 0, 0, Math.PI * 2); fallback.fill();
        fallback.fillStyle = '#f4d7ff'; fallback.beginPath(); fallback.ellipse(0, -5, 12, 15, 0, 0, Math.PI * 2); fallback.fill();
        fallback.fillStyle = '#28213d'; fallback.beginPath(); fallback.moveTo(-14, -10); ctxItSelfLine(); fallback.restore();
      }

      function ctxItSelfLine() {
        return null;
      }

      function render(time, dt) {
        drawBackground(time);
        if (dt > 0) {
          const dx = suki.targetX - suki.x; const dy = suki.targetY - suki.y; const distance = Math.hypot(dx, dy);
          if (distance > 1.5) {
            const travel = Math.min(distance, 90 * dt); suki.x += dx / distance * travel; suki.y += dy / distance * travel; suki.facing = dx < 0 ? -1 : 1; suki.step += dt * 10; suki.pause = 0;
          } else {
            suki.x = suki.targetX; suki.y = suki.targetY; suki.pause -= dt; if (suki.pause <= 0) pickDestination();
          }
          suki.blink = (suki.blink + dt) % 7;
        }
        const walking = Math.hypot(suki.targetX - suki.x, suki.targetY - suki.y) > 1.5;
        drawSuki(time, walking);
      }

      function tick(timestamp) {
        if (destroyed || document.hidden || reduceMotion.matches) { raf = 0; return; }
        const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.04) : 1 / 60;
        lastTime = timestamp; render(timestamp / 1000, dt); raf = requestAnimationFrame(tick);
      }

      function start() {
        resize(); if (reduceMotion.matches) { render(performance.now() / 1000, 0); return; }
        pickDestination(); raf = requestAnimationFrame(tick);
      }

      function onVisibilityChange() {
        if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; lastTime = 0; }
        else if (!reduceMotion.matches && !raf) { pickDestination(); raf = requestAnimationFrame(tick); }
      }
      window.addEventListener('resize', resize, { passive: true });
      if (window.visualViewport) window.visualViewport.addEventListener('resize', resize, { passive: true });
      document.addEventListener('visibilitychange', onVisibilityChange);
      start();
      return { destroy() { destroyed = true; if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', resize); if (window.visualViewport) window.visualViewport.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVisibilityChange); } };
    })();
    window.sukiWalk = legacy;
    return;
  }

  const THREE = window.THREE;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070812, 14, 30);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.8, 7.8);

  const root = new THREE.Group();
  scene.add(root);

  const ambient = new THREE.HemisphereLight(0xa5f3ff, 0x120a2a, 1.2);
  scene.add(ambient);

  const rim = new THREE.DirectionalLight(0x67e8f9, 1.4);
  rim.position.set(3, 4, 5);
  scene.add(rim);

  const pink = new THREE.PointLight(0xff4dcb, 3, 18, 2);
  pink.position.set(-1.2, 1.4, 2.4);
  scene.add(pink);

  const cyan = new THREE.PointLight(0x67e8f9, 2.5, 18, 2);
  cyan.position.set(1.6, 1.6, 2.2);
  scene.add(cyan);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 32),
    new THREE.MeshStandardMaterial({
      color: 0x120a22,
      emissive: 0x120a22,
      transparent: true,
      opacity: 0.9,
      metalness: 0.3,
      roughness: 0.7,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.2;
  root.add(floor);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.08, 16, 160),
    new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x67e8f9,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.7,
    })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -1.8;
  root.add(halo);

  const materialBody = new THREE.MeshStandardMaterial({ color: 0xf5d7ff, emissive: 0x2a123a, emissiveIntensity: 0.5, roughness: 0.7, metalness: 0.1 });
  const materialHair = new THREE.MeshStandardMaterial({ color: 0x1c1224, emissive: 0x170d20, roughness: 0.9, metalness: 0.12 });
  const materialAccent = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x67e8f9, emissiveIntensity: 1.5, metalness: 0.2, roughness: 0.4 });
  const materialPink = new THREE.MeshStandardMaterial({ color: 0xff5dcb, emissive: 0xff5dcb, emissiveIntensity: 1.3, metalness: 0.2, roughness: 0.4 });
  const materialDark = new THREE.MeshStandardMaterial({ color: 0x1d1230, emissive: 0x130b1d, roughness: 0.8, metalness: 0.15 });
  const materialSuit = new THREE.MeshStandardMaterial({ color: 0x2c2e59, emissive: 0x0f1333, roughness: 0.75, metalness: 0.28 });

  const sukiGroup = new THREE.Group();
  root.add(sukiGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 32), materialBody);
  head.position.y = 1.7;
  sukiGroup.add(head);

  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.9), materialHair);
  hairBack.scale.y = 1.2;
  hairBack.position.set(0, 1.88, -0.18);
  hairBack.rotation.z = Math.PI * 0.15;
  sukiGroup.add(hairBack);

  const bangs = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.5), materialHair);
  bangs.position.set(0, 2.35, 0.55);
  bangs.rotation.x = 0.3;
  sukiGroup.add(bangs);

  const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 12), materialHair);
  leftEar.position.set(-0.8, 2.5, 0.03);
  leftEar.rotation.z = -0.7;
  sukiGroup.add(leftEar);

  const rightEar = leftEar.clone();
  rightEar.position.x = 0.8;
  rightEar.rotation.z = 0.7;
  sukiGroup.add(rightEar);

  const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const leftEye = new THREE.Mesh(eyeGeo, materialAccent);
  leftEye.position.set(-0.25, 1.8, 0.77);
  sukiGroup.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.position.x = 0.25;
  sukiGroup.add(rightEye);

  const irisLeft = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), materialPink);
  irisLeft.position.set(-0.25, 1.8, 0.87);
  sukiGroup.add(irisLeft);

  const irisRight = irisLeft.clone();
  irisRight.position.x = 0.25;
  sukiGroup.add(irisRight);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), materialPink);
  nose.position.set(0, 1.45, 0.82);
  nose.rotation.x = Math.PI / 2;
  sukiGroup.add(nose);

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 24, Math.PI), materialPink);
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, 1.15, 0.79);
  sukiGroup.add(mouth);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.5, 8, 16), materialSuit);
  torso.position.y = -0.25;
  sukiGroup.add(torso);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.1, 12, 40), materialAccent);
  collar.position.set(0, 0.7, 0.1);
  collar.rotation.x = Math.PI / 2;
  sukiGroup.add(collar);

  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.8, 0.7, 16), materialDark);
  waist.position.y = -1.45;
  sukiGroup.add(waist);

  const skirt = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.3, 18), materialDark);
  skirt.position.y = -2.0;
  skirt.rotation.y = Math.PI / 18;
  sukiGroup.add(skirt);

  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 1.1, 6, 12), materialBody);
  leftArm.position.set(-1.1, 0.2, 0.05);
  leftArm.rotation.z = -0.7;
  sukiGroup.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 1.1;
  rightArm.rotation.z = 0.7;
  sukiGroup.add(rightArm);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), materialPink);
  leftHand.position.set(-1.5, -0.65, 0.1);
  sukiGroup.add(leftHand);

  const rightHand = leftHand.clone();
  rightHand.position.x = 1.5;
  sukiGroup.add(rightHand);

  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.2, 6, 12), materialBody);
  leftLeg.position.set(-0.38, -2.8, 0.1);
  leftLeg.rotation.x = 0.12;
  sukiGroup.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.38;
  sukiGroup.add(rightLeg);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.9), materialAccent);
  leftBoot.position.set(-0.38, -3.75, 0.18);
  sukiGroup.add(leftBoot);

  const rightBoot = leftBoot.clone();
  rightBoot.position.x = 0.38;
  sukiGroup.add(rightBoot);

  const accentRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.04, 10, 100),
    new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x67e8f9, emissiveIntensity: 2, transparent: true, opacity: 0.8 })
  );
  accentRing.position.y = 0.2;
  accentRing.rotation.x = Math.PI / 2;
  sukiGroup.add(accentRing);

  const particles = new THREE.Group();
  const particlesMaterial = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x67e8f9, emissiveIntensity: 1.8 });
  for (let i = 0; i < 26; i += 1) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), particlesMaterial);
    p.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
    particles.add(p);
  }
  root.add(particles);

  const target = { x: 0, y: 0, z: 0 };
  const state = { x: 0, y: 0 };
  let animationFrame = 0;

  function resizeRenderer() {
    const width =canvas.clientWidth || canvas.parentElement?.clientWidth || 220;
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 220;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function animate() {
    const time = performance.now() * 0.001;
    state.x += (target.x - state.x) * 0.06;
    state.y += (target.y - state.y) * 0.06;
    sukiGroup.position.x = state.x;
    sukiGroup.position.y = state.y + Math.sin(time * 2.4) * 0.18;
    sukiGroup.rotation.y = Math.sin(time * 0.9) * 0.7;
    sukiGroup.rotation.z = Math.sin(time * 1.5) * 0.12;
    accentRing.rotation.z = time * 1.2;
    halo.rotation.z = -time * 0.8;

    particles.rotation.y = time * 0.7;
    particles.rotation.x = time * 0.9;
    particles.children.forEach((p, idx) => {
      const offset = idx * 0.13;
      p.position.y += Math.sin(time * 2 + offset) * 0.002;
      p.position.x += Math.cos(time * 2.4 + offset) * 0.0012;
    });

    pink.intensity = 2.8 + Math.sin(time * 2.6) * 0.8;
    cyan.intensity = 2.2 + Math.cos(time * 2.2) * 0.7;

    leftEye.scale.y = 1.0 - Math.sin(time * 5) * 0.1;
    rightEye.scale.y = 1.0 - Math.sin(time * 5 + 0.4) * 0.1;
    leftEye.material.emissiveIntensity = 1.5 + Math.sin(time * 5) * 0.3;
    rightEye.material.emissiveIntensity = 1.5 + Math.sin(time * 5 + 0.4) * 0.3;

    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  }

  const onPointer = (event) => {
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    target.x = (px - 0.5) * 2.4;
    target.y = (0.5 - py) * 1.4;
  };

  canvas.addEventListener('pointermove', onPointer);
  canvas.addEventListener('pointerdown', onPointer);
  canvas.addEventListener('pointerleave', () => {
    target.x = 0; target.y = 0;
  });

  resizeRenderer();
  window.addEventListener('resize', resizeRenderer, { passive: true });
  animate();

  window.sukiWalk = {
    destroy() {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      canvas.removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', resizeRenderer);
    }
  };
})();
