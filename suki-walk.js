(() => {
  'use strict';

  const canvas = document.getElementById('suki-avatar-canvas');
  if (!canvas) return;

  const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let stopRenderer = () => {};

  // Keep the avatar canvas sized independently of external CSS so its renderer
  // never mistakes the browser's default 300x150 canvas size for the HUD size.
  canvas.style.width ||= '96px';
  canvas.style.height ||= '96px';
  canvas.style.display = 'block';

  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = THREE_CDN;
      script.async = true;
      script.onload = () => window.THREE ? resolve(window.THREE) : reject(new Error('Three.js did not expose THREE'));
      script.onerror = () => reject(new Error('Three.js CDN request failed'));
      document.head.appendChild(script);
    });
  }

  function freshCanvas(previous) {
    const replacement = previous.cloneNode(false);
    replacement.style.width = previous.style.width || '96px';
    replacement.style.height = previous.style.height || '96px';
    previous.replaceWith(replacement);
    return replacement;
  }

  function startFallback(previousCanvas) {
    // WebGL and 2D contexts cannot share a canvas. Replace it if WebGL creation
    // was attempted and failed before requesting the 2D context.
    const targetCanvas = freshCanvas(previousCanvas);
    const context = targetCanvas.getContext('2d');
    if (!context) return;

    let width = 96;
    let height = 96;
    let frame = 0;
    let phase = 0;
    let observer;

    function draw() {
      context.clearRect(0, 0, width, height);
      const gradient = context.createRadialGradient(width / 2, height / 2, 2, width / 2, height / 2, Math.max(width, height) * 0.72);
      gradient.addColorStop(0, 'rgba(103,232,249,.25)');
      gradient.addColorStop(1, 'rgba(9,7,18,.96)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const unit = Math.min(width, height) / 4.2;
      const x = width / 2 + Math.sin(phase) * width * 0.08;
      const y = height / 2 + Math.sin(phase * 2) * 1.5;
      context.save();
      context.translate(x, y);
      context.shadowColor = '#bd00ff';
      context.shadowBlur = 8;
      context.fillStyle = '#f4d7ff';
      context.beginPath();
      context.moveTo(-unit * .5, -unit * .45);
      context.lineTo(-unit * .38, -unit * 1.2);
      context.lineTo(-unit * .08, -unit * .72);
      context.moveTo(unit * .5, -unit * .45);
      context.lineTo(unit * .38, -unit * 1.2);
      context.lineTo(unit * .08, -unit * .72);
      context.fill();
      context.beginPath();
      context.ellipse(0, -unit * .18, unit * .58, unit * .66, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#21142e';
      context.beginPath();
      context.ellipse(0, -unit * .58, unit * .53, unit * .32, Math.PI, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = '#67e8f9';
      context.beginPath();
      context.ellipse(-unit * .2, -unit * .16, unit * .055, unit * .12, 0, 0, Math.PI * 2);
      context.ellipse(unit * .2, -unit * .16, unit * .055, unit * .12, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#ff5dcb';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(0, unit * .02, unit * .13, 0.15 * Math.PI, 0.85 * Math.PI);
      context.stroke();
      context.restore();
    }

    function resize() {
      const rect = targetCanvas.getBoundingClientRect();
      width = Math.max(1, rect.width || 96);
      height = Math.max(1, rect.height || 96);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      targetCanvas.width = Math.round(width * ratio);
      targetCanvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }

    function animate() {
      if (document.hidden || motionQuery?.matches) { frame = 0; return; }
      phase += 0.025;
      draw();
      frame = requestAnimationFrame(animate);
    }

    const onVisibility = () => {
      if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; }
      else if (!motionQuery?.matches && !frame) frame = requestAnimationFrame(animate);
      else if (motionQuery?.matches) draw();
    };
    const onMotionChange = () => {
      if (motionQuery.matches) { if (frame) cancelAnimationFrame(frame); frame = 0; draw(); }
      else if (!document.hidden && !frame) frame = requestAnimationFrame(animate);
    };

    observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    observer?.observe(targetCanvas);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    motionQuery?.addEventListener?.('change', onMotionChange);
    resize();
    if (!motionQuery?.matches) frame = requestAnimationFrame(animate);

    stopRenderer = () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery?.removeEventListener?.('change', onMotionChange);
    };
  }

  function startThree(targetCanvas, THREE) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: targetCanvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch (error) {
      throw new Error(`WebGL renderer could not be created: ${error.message}`);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
    camera.position.set(0, 0.05, 5.4);
    scene.add(new THREE.HemisphereLight(0xd8f8ff, 0x21102e, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(-2, 3, 5);
    scene.add(keyLight);
    const glow = new THREE.PointLight(0x67e8f9, 8, 10);
    glow.position.set(2, 1, 3);
    scene.add(glow);

    const suki = new THREE.Group();
    scene.add(suki);
    const material = (color, emissive = 0x000000, emissiveIntensity = 0) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, roughness: 0.55 });
    const skin = material(0xf4d7ff, 0x321744, 0.3);
    const hair = material(0x21142e, 0x100817, 0.2);
    const cyan = material(0x67e8f9, 0x27cbe5, 1.3);
    const pink = material(0xff5dcb, 0x9c176e, 0.8);
    const suit = material(0x382455, 0x160b2c, 0.4);

    function add(geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      suki.add(mesh);
      return mesh;
    }

    // Compact chibi bust, framed to fit the 96px HUD avatar.
    add(new THREE.SphereGeometry(0.7, 24, 20), skin, 0, 0.28, 0, 1, 1.08, 0.8);
    add(new THREE.SphereGeometry(0.74, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.52, -0.02, 1.05, 1.1, 0.95);
    add(new THREE.ConeGeometry(0.18, 0.55, 12), hair, -0.53, 0.96, 0).rotation.z = 0.2;
    add(new THREE.ConeGeometry(0.18, 0.55, 12), hair, 0.53, 0.96, 0).rotation.z = -0.2;
    add(new THREE.BoxGeometry(0.86, 0.2, 0.26), hair, 0, 0.68, 0.59);
    const eyeL = add(new THREE.SphereGeometry(0.085, 12, 10), cyan, -0.22, 0.27, 0.62, 1, 1.35, 0.5);
    const eyeR = add(new THREE.SphereGeometry(0.085, 12, 10), cyan, 0.22, 0.27, 0.62, 1, 1.35, 0.5);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 18, Math.PI), pink);
    mouth.position.set(0, 0.02, 0.62);
    mouth.rotation.z = Math.PI;
    suki.add(mouth);
    add(new THREE.CapsuleGeometry(0.36, 0.5, 4, 10), suit, 0, -0.82, 0, 1, 0.9, 0.75);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.025, 6, 48), cyan);
    halo.position.y = -0.1;
    halo.rotation.x = 0.4;
    suki.add(halo);

    let frame = 0;
    let observer;
    let phase = 0;
    const target = new THREE.Vector2();
    const onPointer = (event) => {
      const rect = targetCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      target.x = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width - 0.5) * 0.35, -0.18, 0.18);
      target.y = THREE.MathUtils.clamp((0.5 - (event.clientY - rect.top) / rect.height) * 0.25, -0.12, 0.12);
    };
    const onPointerLeave = () => target.set(0, 0);

    function resize() {
      const rect = targetCanvas.getBoundingClientRect();
      const width = Math.max(1, rect.width || 96);
      const height = Math.max(1, rect.height || 96);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    function draw() {
      phase += 0.018;
      suki.position.x += (target.x - suki.position.x) * 0.05;
      suki.position.y += (target.y + Math.sin(phase * 2) * 0.025 - suki.position.y) * 0.05;
      suki.rotation.y = Math.sin(phase * 0.7) * 0.14;
      halo.rotation.z += 0.005;
      const blink = Math.sin(phase * 2.1) > 0.985 ? 0.12 : 1;
      eyeL.scale.y = blink;
      eyeR.scale.y = blink;
      renderer.render(scene, camera);
    }
    function animate() {
      if (document.hidden || motionQuery?.matches) { frame = 0; return; }
      draw();
      frame = requestAnimationFrame(animate);
    }
    const onVisibility = () => {
      if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; }
      else if (!motionQuery?.matches && !frame) frame = requestAnimationFrame(animate);
      else if (motionQuery?.matches) draw();
    };
    const onMotionChange = () => {
      if (motionQuery.matches) { if (frame) cancelAnimationFrame(frame); frame = 0; draw(); }
      else if (!document.hidden && !frame) frame = requestAnimationFrame(animate);
    };
    const onContextLost = (event) => { event.preventDefault(); if (frame) cancelAnimationFrame(frame); frame = 0; };

    targetCanvas.addEventListener('pointermove', onPointer, { passive: true });
    targetCanvas.addEventListener('pointerdown', onPointer, { passive: true });
    targetCanvas.addEventListener('pointerleave', onPointerLeave, { passive: true });
    targetCanvas.addEventListener('webglcontextlost', onContextLost);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    motionQuery?.addEventListener?.('change', onMotionChange);
    observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    observer?.observe(targetCanvas);
    resize();
    if (motionQuery?.matches) draw();
    else frame = requestAnimationFrame(animate);

    stopRenderer = () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      targetCanvas.removeEventListener('pointermove', onPointer);
      targetCanvas.removeEventListener('pointerdown', onPointer);
      targetCanvas.removeEventListener('pointerleave', onPointerLeave);
      targetCanvas.removeEventListener('webglcontextlost', onContextLost);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery?.removeEventListener?.('change', onMotionChange);
      renderer.dispose();
    };
  }

  loadThree()
    .then((THREE) => {
      if (canvas.isConnected) startThree(canvas, THREE);
    })
    .catch((error) => {
      console.warn('[SukiBot] 3D avatar unavailable; drawing 2D fallback.', error);
      if (canvas.isConnected) startFallback(canvas);
    });

  window.sukiWalk = { destroy() { stopRenderer(); } };
})();
