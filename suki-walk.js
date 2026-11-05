(() => {
  'use strict';

  const canvas = document.getElementById('suki-avatar-canvas');
  if (!canvas) return;

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let destroyCurrent = () => {};

  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = THREE_URL;
      script.async = true;
      script.onload = () => window.THREE ? resolve(window.THREE) : reject(new Error('Three.js loaded without a global THREE object'));
      script.onerror = () => reject(new Error('Unable to load Three.js'));
      document.head.appendChild(script);
    });
  }

  function replaceCanvas(oldCanvas) {
    const replacement = oldCanvas.cloneNode(false);
    oldCanvas.replaceWith(replacement);
    return replacement;
  }

  function startFallback(oldCanvas) {
    const fallbackCanvas = replaceCanvas(oldCanvas);
    const ctx = fallbackCanvas.getContext('2d');
    if (!ctx) return;

    let width = 1;
    let height = 1;
    let frame = 0;
    let phase = 0;
    let observer;

    function resize() {
      const rect = fallbackCanvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      fallbackCanvas.width = Math.round(width * ratio);
      fallbackCanvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 4, width / 2, height / 2, Math.max(width, height));
      gradient.addColorStop(0, 'rgba(103,232,249,.25)');
      gradient.addColorStop(1, 'rgba(9,7,18,.96)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const size = Math.min(width, height) * 0.23;
      const x = width / 2 + Math.sin(phase) * width * 0.12;
      const y = height / 2 + Math.sin(phase * 2) * 3;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#f4d7ff';
      ctx.beginPath();
      ctx.moveTo(-size * .55, -size * 1.15); ctx.lineTo(-size * .42, -size * 1.75); ctx.lineTo(-size * .08, -size * .85);
      ctx.moveTo(size * .55, -size * 1.15); ctx.lineTo(size * .42, -size * 1.75); ctx.lineTo(size * .08, -size * .85);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -size * .55, size * .72, size * .8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#20132f';
      ctx.beginPath();
      ctx.ellipse(0, -size * .95, size * .68, size * .42, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.ellipse(-size * .24, -size * .55, size * .07, size * .15, 0, 0, Math.PI * 2);
      ctx.ellipse(size * .24, -size * .55, size * .07, size * .15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function animate() {
      if (document.hidden || reducedMotion?.matches) { frame = 0; return; }
      phase += 0.025;
      draw();
      frame = requestAnimationFrame(animate);
    }

    observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    observer?.observe(fallbackCanvas);
    window.addEventListener('resize', resize, { passive: true });
    const onVisibility = () => {
      if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; }
      else if (!reducedMotion?.matches && !frame) frame = requestAnimationFrame(animate);
    };
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    if (!reducedMotion?.matches) frame = requestAnimationFrame(animate);

    destroyCurrent = () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }

  function startThree(oldCanvas, THREE) {
    const renderer = new THREE.WebGLRenderer({ canvas: oldCanvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0.15, 7.2);

    scene.add(new THREE.HemisphereLight(0xc7f7ff, 0x271238, 2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(-3, 5, 6);
    scene.add(keyLight);
    const cyanLight = new THREE.PointLight(0x67e8f9, 18, 12);
    cyanLight.position.set(2, 1, 3);
    scene.add(cyanLight);
    const pinkLight = new THREE.PointLight(0xff5dcb, 12, 12);
    pinkLight.position.set(-2, -1, 2);
    scene.add(pinkLight);

    const suki = new THREE.Group();
    scene.add(suki);
    const mat = (color, emissive = 0x000000, intensity = 0) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.48, metalness: 0.08 });
    const skin = mat(0xf4d7ff, 0x351443, 0.35);
    const hair = mat(0x21142e, 0x12091d, 0.2);
    const cyan = mat(0x67e8f9, 0x27cbe5, 1.4);
    const pink = mat(0xff5dcb, 0x9c176e, 0.9);
    const suit = mat(0x382455, 0x160b2c, 0.45);

    function add(geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      suki.add(mesh);
      return mesh;
    }

    add(new THREE.SphereGeometry(0.82, 24, 20), skin, 0, 0.34, 0, 1, 1.12, 0.82);
    add(new THREE.SphereGeometry(0.86, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), hair, 0, 0.66, -0.02, 1.04, 1.1, 0.95);
    add(new THREE.ConeGeometry(0.22, 0.68, 12), hair, -0.61, 1.15, 0, 1, 1, 0.8).rotation.z = 0.22;
    add(new THREE.ConeGeometry(0.22, 0.68, 12), hair, 0.61, 1.15, 0, 1, 1, 0.8).rotation.z = -0.22;
    add(new THREE.BoxGeometry(1.05, 0.23, 0.3), hair, 0, 0.85, 0.69).rotation.z = -0.08;
    const leftEye = add(new THREE.SphereGeometry(0.095, 16, 12), cyan, -0.27, 0.32, 0.72, 1, 1.45, 0.45);
    const rightEye = add(new THREE.SphereGeometry(0.095, 16, 12), cyan, 0.27, 0.32, 0.72, 1, 1.45, 0.45);
    add(new THREE.SphereGeometry(0.075, 12, 10), pink, 0, 0.08, 0.75, 0.7, 0.55, 0.45);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 24, Math.PI), pink);
    mouth.position.set(0, -0.08, 0.72);
    mouth.rotation.z = Math.PI;
    suki.add(mouth);
    add(new THREE.CapsuleGeometry(0.42, 0.62, 5, 12), suit, 0, -0.95, 0, 1, 1, 0.75);
    add(new THREE.TorusGeometry(0.42, 0.065, 8, 28), cyan, 0, -0.54, 0.02, 1, 1, 0.8).rotation.x = Math.PI / 2;

    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.035, 8, 64), cyan);
    halo.position.set(0, -0.22, -0.25);
    halo.rotation.x = 0.35;
    suki.add(halo);
    const sparkles = new THREE.Group();
    scene.add(sparkles);
    for (let i = 0; i < 10; i += 1) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), i % 2 ? cyan : pink);
      const angle = i * Math.PI * 2 / 10;
      dot.position.set(Math.cos(angle) * 1.55, Math.sin(angle) * 1.2, -0.15);
      sparkles.add(dot);
    }

    let frame = 0;
    let observer;
    let phase = 0;
    const target = new THREE.Vector2(0, 0);
    const onPointer = (event) => {
      const rect = oldCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      target.x = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width - 0.5) * 0.5, -0.25, 0.25);
      target.y = THREE.MathUtils.clamp((0.5 - (event.clientY - rect.top) / rect.height) * 0.35, -0.18, 0.18);
    };
    const onPointerLeave = () => target.set(0, 0);

    function resize() {
      const rect = oldCanvas.getBoundingClientRect();
      const width = Math.max(1, rect.width || oldCanvas.clientWidth || 96);
      const height = Math.max(1, rect.height || oldCanvas.clientHeight || 96);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function draw() {
      phase += 0.018;
      suki.position.x += (target.x - suki.position.x) * 0.045;
      suki.position.y += (target.y + Math.sin(phase * 2) * 0.035 - suki.position.y) * 0.045;
      suki.rotation.y = Math.sin(phase * 0.7) * 0.16;
      suki.rotation.z = Math.sin(phase * 1.4) * 0.035;
      halo.rotation.z += 0.006;
      sparkles.rotation.z -= 0.003;
      const blink = Math.sin(phase * 2.2) > 0.985 ? 0.12 : 1;
      leftEye.scale.y = blink;
      rightEye.scale.y = blink;
      renderer.render(scene, camera);
    }

    function animate() {
      if (document.hidden || reducedMotion?.matches) { frame = 0; return; }
      draw();
      frame = requestAnimationFrame(animate);
    }

    const onVisibility = () => {
      if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; }
      else if (!reducedMotion?.matches && !frame) frame = requestAnimationFrame(animate);
      else if (reducedMotion?.matches) draw();
    };
    const onMotionChange = () => {
      if (reducedMotion.matches) { if (frame) cancelAnimationFrame(frame); frame = 0; draw(); }
      else if (!document.hidden && !frame) frame = requestAnimationFrame(animate);
    };
    const onContextLost = (event) => { event.preventDefault(); if (frame) cancelAnimationFrame(frame); frame = 0; };

    oldCanvas.addEventListener('pointermove', onPointer, { passive: true });
    oldCanvas.addEventListener('pointerdown', onPointer, { passive: true });
    oldCanvas.addEventListener('pointerleave', onPointerLeave, { passive: true });
    oldCanvas.addEventListener('webglcontextlost', onContextLost, false);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    reducedMotion?.addEventListener?.('change', onMotionChange);
    observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    observer?.observe(oldCanvas);

    resize();
    if (reducedMotion?.matches) draw();
    else frame = requestAnimationFrame(animate);

    destroyCurrent = () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      oldCanvas.removeEventListener('pointermove', onPointer);
      oldCanvas.removeEventListener('pointerdown', onPointer);
      oldCanvas.removeEventListener('pointerleave', onPointerLeave);
      oldCanvas.removeEventListener('webglcontextlost', onContextLost);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      reducedMotion?.removeEventListener?.('change', onMotionChange);
      renderer.dispose();
    };
  }

  loadThree()
    .then((THREE) => {
      if (canvas.isConnected) startThree(canvas, THREE);
    })
    .catch((error) => {
      console.warn('[SukiBot] 3D renderer unavailable; using 2D fallback.', error);
      if (canvas.isConnected) startFallback(canvas);
    });

  window.sukiWalk = {
    destroy() {
      destroyCurrent();
    }
  };
})();
