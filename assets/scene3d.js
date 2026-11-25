/* dkvb.dev 3D figures: the Herbert River terrain (sugar page) and the Skills United phone (Android page).
   Built to be cheap: nothing loads until a figure is about to scroll into view, nothing loads at all on
   data-saver, low-memory devices or when motion is switched off, frames render only while the figure is
   on screen, and the Blender still stays in place whenever the 3D can't run. */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const conn = navigator.connection || {};
const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 2;

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

const eligible = !reduced && !conn.saveData && !lowMemory && webglOK();

function setup(fig) {
  if (!eligible) { fig.classList.add('is-still'); return; }
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    start(fig).catch(() => fig.classList.add('is-still'));
  }, { rootMargin: '300px 0px' });
  io.observe(fig);
}

async function start(fig) {
  const THREE = await import('three');
  const { GLTFLoader } = await import('./vendor/three/addons/loaders/GLTFLoader.js');
  const kind = fig.dataset['3d'];
  const stage = fig.querySelector('.model3d-stage');
  const labels = fig.querySelector('.model3d-labels');
  const toggle = fig.querySelector('[data-3d-toggle]');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(kind === 'terrain' ? 32 : 26, 1, 0.1, 200);
  const pivot = new THREE.Group();
  scene.add(pivot);
  scene.add(new THREE.HemisphereLight(0xf4efe2, 0x0d1610, kind === 'terrain' ? 0.85 : 1.4));
  const sun = new THREE.DirectionalLight(0xfff3dc, kind === 'terrain' ? 1.7 : 1.6);
  sun.position.set(6, 9, -5);
  scene.add(sun);

  const gltf = await new GLTFLoader().loadAsync(fig.dataset.src);
  const model = gltf.scene;
  const placeLabels = [];

  if (kind === 'terrain') {
    model.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      if (o.geometry.attributes.color) {
        o.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
      } else {
        o.material = new THREE.MeshStandardMaterial({ color: 0x2b4d5a, roughness: 0.45, metalness: 0 });
      }
    });
    model.scale.setScalar(1 / 40);
    pivot.add(model);
    camera.position.set(0.6, 1.3, 2.4);
    camera.lookAt(0, -0.1, 0.1);
    if (fig.dataset.places) {
      const data = await (await fetch(fig.dataset.places)).json();
      const RANK = ['Ingham', 'Cardwell', 'Hinchinbrook Island', 'Forrest Beach', 'Lucinda', 'Halifax'];
      for (const [name, p] of Object.entries(data.markers)) {
        const anchor = new THREE.Object3D();
        anchor.position.set(p[0], p[1], p[2]);
        model.add(anchor);
        const el = document.createElement('span');
        el.className = 'model3d-place' + (name === 'Ingham' ? ' is-home' : '');
        el.textContent = name === 'Ingham' ? 'Ingham, my base' : name;
        labels.appendChild(el);
        placeLabels.push({ anchor, el, rank: RANK.indexOf(name) < 0 ? 99 : RANK.indexOf(name) });
      }
    }
  } else {
    const screens = (fig.dataset.screens || '').split('|').filter(Boolean);
    const loader = new THREE.TextureLoader();
    const textures = await Promise.all(screens.map((src) => loader.loadAsync(src).then((t) => {
      t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    })));
    let screenMesh = null;
    model.traverse((o) => {
      if (o.isMesh && o.material && o.material.name === 'Screen') screenMesh = o;
      if (o.isMesh && o.material && o.material.name !== 'Screen') o.material.envMapIntensity = 1;
    });
    if (screenMesh && textures.length) screenMesh.material = new THREE.MeshBasicMaterial({ map: textures[0], toneMapped: false });
    pivot.add(model);
    camera.position.set(0, 0.02, 4.0);
    camera.lookAt(0, 0, 0);
    fig._setScreen = (i) => { if (screenMesh && textures[i]) { screenMesh.material.map = textures[i]; screenMesh.material.needsUpdate = true; } };
  }

  placeLabels.sort((p, q) => p.rank - q.rank);

  /* ── size ── */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    needsFrame = true;
  }
  new ResizeObserver(resize).observe(stage);

  /* ── turning: drag, arrow keys, and (terrain) a slow idle turn that stops by itself ── */
  let yaw = kind === 'terrain' ? -0.35 : -0.35, pitch = 0, dragYaw = 0, dragging = false, lastX = 0, lastY = 0;
  // the terrain is a map now: it sits still until someone turns it
  let idleUntil = 0, paused = false, needsFrame = true, visible = true;
  stage.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; stage.setPointerCapture(e.pointerId); idleUntil = 0;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragYaw += (e.clientX - lastX) * 0.008;
    if (kind === 'terrain') pitch = Math.max(-0.25, Math.min(0.35, pitch + (e.clientY - lastY) * 0.004));
    lastX = e.clientX; lastY = e.clientY; needsFrame = true;
  });
  const endDrag = () => { dragging = false; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  fig.addEventListener('keydown', (e) => {
    if (e.target !== fig) return;
    if (e.key === 'ArrowLeft') { dragYaw -= 0.2; idleUntil = 0; needsFrame = true; e.preventDefault(); }
    if (e.key === 'ArrowRight') { dragYaw += 0.2; idleUntil = 0; needsFrame = true; e.preventDefault(); }
  });
  if (toggle) {
    toggle.hidden = kind !== 'terrain';
    toggle.addEventListener('click', () => {
      paused = !paused;
      if (!paused) idleUntil = performance.now() + 25000;
      toggle.textContent = paused ? 'Turn' : 'Pause';
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
    });
  }

  /* ── phone: each step of the walkthrough shows its screen as it passes the middle of the window ── */
  let targetYaw = yaw;
  if (kind === 'phone') {
    const steps = fig.dataset.steps ? Array.from(document.querySelectorAll(fig.dataset.steps)) : [];
    const walk = fig.closest('.su-walk');
    if (walk) walk.classList.add('is-live');
    let shown = -1;
    const show = (i) => {
      if (i === shown) return;
      shown = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      const screen = Number(steps[i] ? steps[i].dataset.screen : i) || 0;
      if (fig._setScreen) fig._setScreen(screen);
      targetYaw = -0.32 + (steps.length > 1 ? (i / (steps.length - 1)) * 0.64 : 0);
      needsFrame = true;
    };
    const narrow = window.matchMedia('(max-width: 60rem)');
    const onScroll = () => {
      let best = 0;
      if (narrow.matches) {
        // stacked, with the phone pinned on top: show the first step whose text is still clear of the phone
        const under = fig.getBoundingClientRect().bottom - 24;
        best = steps.findIndex((s) => s.getBoundingClientRect().top >= under);
        if (best < 0) best = steps.length - 1;
      } else {
        // side by side: a step counts once it passes the middle of the window
        const mid = window.innerHeight * 0.55;
        steps.forEach((s, k) => { if (s.getBoundingClientRect().top < mid) best = k; });
      }
      show(best);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── render only while on screen and something is changing ── */
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; if (visible) { needsFrame = true; tick(); } }).observe(fig);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { needsFrame = true; tick(); } });

  const v = new THREE.Vector3();
  let last = performance.now(), frames = 0, slow = 0, running = false;
  function frame(now) {
    running = false;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const idle = kind === 'terrain' && !paused && !dragging && now < idleUntil;
    if (idle) { yaw += dt * 0.07; needsFrame = true; }
    if (kind === 'phone' && Math.abs(targetYaw - yaw) > 0.001) { yaw += (targetYaw - yaw) * Math.min(1, dt * 5); needsFrame = true; }
    if (!needsFrame) return;
    needsFrame = false;
    pivot.rotation.y = yaw + dragYaw;
    pivot.rotation.x = pitch;
    renderer.render(scene, camera);

    if (placeLabels.length) {
      const w = stage.clientWidth, h = stage.clientHeight;
      const placed = [];
      // most important first; a label that would overlap one already placed gives way
      for (const p of placeLabels) {
        const { anchor, el } = p;
        anchor.getWorldPosition(v); v.project(camera);
        let on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h;
        const ew = el.offsetWidth, eh = el.offsetHeight;
        // near the right edge, put the name on the other side of its dot so it stays inside the frame
        const flip = x + ew > w - 6;
        const left = flip ? x - ew + 10 : x - 5, top = y - eh / 2;
        if (on && placed.some((r) => left < r.r + 4 && left + ew > r.l - 4 && top < r.b + 2 && top + eh > r.t - 2)) on = false;
        if (on) placed.push({ l: left, r: left + ew, t: top, b: top + eh });
        el.style.opacity = on ? '1' : '0';
        el.classList.toggle('is-flip', flip);
        el.style.transform = `translate(${flip ? x - ew + 10 : x}px, ${y}px)`;
      }
    }
    // if this device struggles, drop the resolution once
    frames++; if (dt > 0.045) slow++;
    if (frames === 60 && slow > 30 && dpr > 1) { dpr = 1; renderer.setPixelRatio(1); resize(); }
    tick();
  }
  function tick() {
    if (running) return;
    if (needsFrame || (kind === 'phone' && Math.abs(targetYaw - yaw) > 0.001) || (kind === 'terrain' && !paused && performance.now() < idleUntil)) { running = true; requestAnimationFrame(frame); }
  }
  // keep checking cheaply for changes (drag, scroll) without a constant render loop
  ['pointermove', 'keydown'].forEach((t) => fig.addEventListener(t, tick));
  window.addEventListener('scroll', tick, { passive: true });

  resize();
  fig.classList.add('is-live');
  fig.tabIndex = 0;
  if (fig.dataset.label) fig.setAttribute('aria-label', fig.dataset.label);
  tick();
}

document.querySelectorAll('[data-3d]').forEach(setup);
