/* Island tour: a Blender-built floating island where each landmark is a chapter.
   Source model: ~/dev/island-resume/build_island.py → assets/island.glb.
   Node names the page relies on: LM_<chapter>, SPINY_*, SPINZ_*, GLOW_*, CLOUD_*, VAN, PLANE, WAVE_arm, ISLAND_main.
   Three.js loads only when the section comes near the viewport, and rendering pauses off-screen. */
(function () {
  const section = document.getElementById('island');
  if (!section) return;
  const stage = section.querySelector('.isl-stage');
  const canvas = section.querySelector('.isl-canvas');
  const pinsEl = section.querySelector('.isl-pins');
  const countEl = section.querySelector('.isl-count');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LABELS = { givelink: 'Givelink', sf: 'San Francisco', aiops: 'AI ops', oss: 'Open source', podcast: 'Podcast', education: 'Education', recognition: 'Recognition' };

  const track = (event, props) => { try { if (window.posthog && posthog.capture) posthog.capture(event, props); } catch (e) {} };
  const goToChapter = (id) => { const el = document.getElementById('isl-' + id); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); };

  fetch('assets/givelink-stats.json').then(r => r.json()).then(s => { if (countEl && s.liveNonprofits) countEl.textContent = s.liveNonprofits; }).catch(() => {});

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  const near = new IntersectionObserver((entries) => {
    if (!entries.some(e => e.isIntersecting)) return;
    near.disconnect();
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
      .then(() => loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'))
      .then(init).catch(() => {});
  }, { rootMargin: '800px 0px' });
  near.observe(section);

  function init() {
    const t0 = performance.now();
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    const hemi = new THREE.HemisphereLight(0xdfefff, 0x6f6150, 0.9);
    const sun = new THREE.DirectionalLight(0xfff1dc, 1.6);
    sun.position.set(10, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
    scene.add(hemi, sun);
    const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light';

    // Stars for the dark (night) theme.
    const starPos = [];
    for (let i = 0; i < 500; i++) { const r = 45 + Math.random() * 30, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1); starPos.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)); }
    const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe7ff, size: 0.35, transparent: true, opacity: 0.8 }));
    scene.add(stars);

    const island = new THREE.Group();
    scene.add(island);
    const landmarks = {}, lmBox = {}, pins = {}, spinY = [], spinZ = [], glows = [], clouds = [], windowMats = [];
    let van = null, plane = null, arm = null, ground = null, gift = null, ready = false;

    const OVERVIEW = { target: new THREE.Vector3(3.2, -1.2, 0.3), offset: new THREE.Vector3(21, 13, 23) };
    let goal = OVERVIEW, yaw = 0, current = 'overview';
    const curTarget = OVERVIEW.target.clone(), curOffset = OVERVIEW.offset.clone().multiplyScalar(1.4);
    const par = new THREE.Vector2(), parGoal = new THREE.Vector2();

    function shotFor(id) {
      const b = lmBox[id];
      if (!b) return OVERVIEW;
      const t = b.c.clone(); t.y = b.base + 1.1;
      const out = new THREE.Vector3(t.x, 0, t.z);
      if (out.length() < 1) out.set(0.8, 0, 0.9);
      out.normalize();
      const side = new THREE.Vector3(-out.z, 0, out.x);
      return { target: t, offset: out.multiplyScalar(8.5).add(side.multiplyScalar(1.6)).add(new THREE.Vector3(0, 4.6, 0)) };
    }

    // Deterministic random so lanterns stay put between visits.
    let seed = 20261121;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const down = new THREE.Raycaster();
    const groundY = (x, z) => { down.set(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0)); const h = ground && down.intersectObject(ground, true)[0]; return h ? h.point.y - island.position.y : 0.1; }; // island-local height (the island may still be rising)

    // Road for the van, from the island edge to the Givelink door (three.js coords: x, -blenderY).
    const ROAD = [[-2.0, 5.2], [-1.4, 4.2], [-0.85, 3.2], [-0.3, 2.2], [0.3, 1.35]];
    let road = null;

    function addLanterns(n) {
      const pts = [];
      let guard = 0;
      while (pts.length < n && guard++ < 6000) {
        const a = rnd() * Math.PI * 2, r = 5.0 * Math.sqrt(0.06 + 0.94 * rnd());
        const x = r * Math.cos(a), z = r * Math.sin(a);
        if (Object.values(lmBox).some(b => Math.hypot(x - b.c.x, z - b.c.z) < 1.35)) continue;
        if (ROAD.some(p => Math.hypot(x - p[0], z - p[1]) < 0.55)) continue;
        if (pts.some(p => Math.hypot(x - p.x, z - p.z) < 0.28)) continue;
        pts.push({ x, z, y: groundY(x, z) });
      }
      const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.022, 0.32, 5), new THREE.MeshStandardMaterial({ color: 0x1a2347, roughness: 0.6 }), pts.length);
      const bulbMat = new THREE.MeshStandardMaterial({ color: 0xf4a924, emissive: 0xf4a924, emissiveIntensity: 1.2, roughness: 0.4 });
      const bulb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), bulbMat, pts.length);
      const m = new THREE.Matrix4();
      pts.forEach((p, i) => { m.makeTranslation(p.x, p.y + 0.16, p.z); post.setMatrixAt(i, m); m.makeTranslation(p.x, p.y + 0.36, p.z); bulb.setMatrixAt(i, m); });
      island.add(post, bulb);
      glows.push(bulbMat);
    }

    new THREE.GLTFLoader().load('assets/island.glb', (gltf) => {
      const root = gltf.scene;
      root.traverse(o => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true;
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
            if (m.name === 'window' && !windowMats.includes(m)) windowMats.push(m);
            if (m.metalness > 0.2) { m.metalness = 0.2; m.roughness = Math.max(m.roughness, 0.35); }
          });
        }
        const n = o.name || '';
        if (n.startsWith('LM_')) landmarks[n.slice(3)] = o;
        else if (n.startsWith('SPINY_')) spinY.push(o);
        else if (n.startsWith('SPINZ_')) spinZ.push(o);
        else if (n.startsWith('CLOUD_')) clouds.push({ o, base: o.position.clone(), p: Math.random() * 6 });
        else if (n === 'VAN') van = o;
        else if (n === 'PLANE') plane = o;
        else if (n === 'WAVE_arm') arm = o;
        else if (n === 'ISLAND_main') ground = o;
        if (n.startsWith('GLOW_')) o.traverse(m => { if (m.isMesh) glows.push(m.material); });
      });
      island.add(root);
      island.updateMatrixWorld(true);
      Object.entries(landmarks).forEach(([id, o]) => {
        const box = new THREE.Box3().setFromObject(o);
        lmBox[id] = { c: box.getCenter(new THREE.Vector3()), base: box.min.y, top: box.max.y };
      });
      road = new THREE.CatmullRomCurve3(ROAD.map(p => new THREE.Vector3(p[0], groundY(p[0], p[1]) + 0.02, p[1])));
      if (plane) scene.add(plane); // the plane flies in world space, not with the bobbing island
      gift = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), new THREE.MeshStandardMaterial({ color: 0xf4a924, emissive: 0xf4a924, emissiveIntensity: 0 }));
      gift.visible = false; island.add(gift);
      fetch('assets/givelink-stats.json').then(r => r.json()).then(s => addLanterns(Math.min(s.liveNonprofits || 0, 400))).catch(() => addLanterns(150));

      Object.keys(LABELS).forEach(id => {
        if (!landmarks[id]) return;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'isl-pin'; b.textContent = LABELS[id];
        b.addEventListener('click', () => { track('island_landmark_click', { landmark: id, via: 'pin' }); goToChapter(id); });
        pinsEl.appendChild(b); pins[id] = b;
      });
      stage.classList.add('isl-loaded');
      ready = true;
      enterT = performance.now();
      track('island_loaded', { ms: Math.round(performance.now() - t0) });
    });

    // Scroll story: the chapter crossing the middle of the viewport picks the shot.
    const seen = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        current = e.target.dataset.lm;
        goal = current === 'overview' ? OVERVIEW : shotFor(current);
        yaw = 0;
        Object.entries(pins).forEach(([id, b]) => b.setAttribute('aria-current', String(id === current)));
        if (current !== 'overview' && !seen.has(current)) { seen.add(current); track('island_chapter_view', { chapter: current }); }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    section.querySelectorAll('[data-lm]').forEach(el => io.observe(el));

    // Drag to orbit, tap a landmark to open its chapter, gentle mouse parallax on desktop.
    let dragging = false, lastX = 0, moved = 0;
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    function hitLandmark(ev) {
      const r = canvas.getBoundingClientRect();
      ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObject(island, true)[0];
      for (let o = hit && hit.object; o; o = o.parent) if (o.name && o.name.startsWith('LM_')) return o.name.slice(3);
      return null;
    }
    canvas.addEventListener('pointerdown', ev => { dragging = true; moved = 0; lastX = ev.clientX; canvas.setPointerCapture(ev.pointerId); });
    canvas.addEventListener('pointermove', ev => {
      const r = canvas.getBoundingClientRect();
      if (ev.pointerType === 'mouse') parGoal.set(((ev.clientX - r.left) / r.width) * 2 - 1, ((ev.clientY - r.top) / r.height) * 2 - 1);
      if (dragging) { const dx = ev.clientX - lastX; lastX = ev.clientX; moved += Math.abs(dx); yaw -= dx * 0.006; }
      else if (ev.pointerType === 'mouse') canvas.style.cursor = hitLandmark(ev) ? 'pointer' : '';
    });
    canvas.addEventListener('pointerleave', () => parGoal.set(0, 0));
    canvas.addEventListener('pointerup', ev => {
      dragging = false;
      if (moved < 6) { const id = hitLandmark(ev); if (id) { track('island_landmark_click', { landmark: id, via: '3d' }); goToChapter(id); } }
    });

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    // Pause rendering while the section is off-screen.
    let visible = true;
    new IntersectionObserver(e => { visible = e[e.length - 1].isIntersecting; if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }, { rootMargin: '100px 0px' }).observe(section);

    const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const ease = x => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
    let last = performance.now(), enterT = 0;
    const VAN_CYCLE = 16;

    function animateVan(t) {
      if (!van || !road) return;
      const c = t % VAN_CYCLE;
      let s, back = false;
      if (c < 6) s = ease(c / 6);                       // drive to the door
      else if (c < 8) s = 1;                            // park, drop the gift
      else if (c < 13) { s = 1 - ease((c - 8) / 5); back = true; }
      else s = 0;                                       // wait at the edge
      const p = road.getPointAt(s), tan = road.getTangentAt(s);
      van.position.copy(p);
      const dir = back ? tan.clone().negate() : tan;
      van.rotation.set(0, Math.atan2(-dir.z, dir.x), 0);
      van.visible = c < 13.5;
      if (gift) {
        if (c >= 6 && c < 9) {
          const k = Math.min((c - 6) / 0.6, 1);
          gift.visible = true;
          gift.position.set(p.x - 0.35, p.y + 0.9 - 0.75 * (k * k), p.z - 0.25);
          gift.rotation.y = c * 2;
          gift.material.emissiveIntensity = k >= 1 ? Math.max(0, 1.6 - (c - 6.6) * 2) : 0; // flash on landing
        } else gift.visible = false;
      }
    }

    let running = false;
    function frame(now) {
      if (!visible) { running = false; return; }
      running = true;
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05); last = now;
      const t = now / 1000;
      const k = reduce ? 1 : 1 - Math.pow(0.02, dt);
      curTarget.lerp(goal.target, k);
      curOffset.lerp(goal.offset, k);
      par.lerp(parGoal, reduce ? 1 : 1 - Math.pow(0.1, dt));
      const narrow = canvas.clientWidth < 520 ? (current === 'overview' ? 0.8 : 0.95) : 1;
      tmp.copy(curOffset).multiplyScalar(narrow).applyAxisAngle(up, yaw + par.x * 0.12);
      tmp.y += par.y * 1.2;
      camera.position.copy(curTarget).add(tmp);
      camera.lookAt(curTarget);

      if (ready) {
        // Entrance: the island rises through the clouds, which drift back into place.
        const e = reduce ? 1 : ease((now - enterT) / 2400);
        island.position.y = (1 - e) * -9 + (reduce ? 0 : Math.sin(t * 0.6) * 0.12 * e);
        clouds.forEach(c => {
          c.o.position.set(c.base.x * (1 + (1 - e) * 0.8), c.base.y + (reduce ? 0 : Math.sin(t * 0.5 + c.p) * 0.25), c.base.z * (1 + (1 - e) * 0.8));
        });
        if (!reduce) {
          spinY.forEach(o => { o.rotation.y += dt * 0.9; });
          spinZ.forEach(o => { o.rotation.z -= dt * 0.7; });
          if (arm) arm.rotation.z = -0.35 + Math.sin(t * 7) * 0.45;
          animateVan(t);
          if (plane) {
            const a = t * 0.22, cx = 4.2, cz = 0.3, rx = 10.5, rz = 6.5;
            plane.position.set(cx + rx * Math.cos(a), 4.4 + Math.sin(a * 2) * 0.6, cz + rz * Math.sin(a));
            const vx = -rx * Math.sin(a), vz = rz * Math.cos(a);
            plane.rotation.set(0, Math.atan2(-vz, vx), 0);
            plane.rotateX(-0.25);
          }
        } else if (van && road) { const p = road.getPointAt(1); van.position.copy(p); }
        const dark = isDark();
        hemi.intensity = dark ? 0.75 : 0.9; hemi.color.setHex(dark ? 0x9fb4ff : 0xdfefff);
        sun.intensity = dark ? 0.45 : 1.6; sun.color.setHex(dark ? 0xb8c8ff : 0xfff1dc);
        stars.visible = dark;
        windowMats.forEach(m => { m.emissive.setHex(dark ? 0xf4a924 : 0x000000); m.emissiveIntensity = dark ? 1.4 : 0; });
        glows.forEach(m => { if (m.emissive) m.emissiveIntensity = (dark ? 3 : 1.2) * (reduce ? 1 : 0.8 + 0.2 * Math.sin(t * 2.2)); });
      }
      renderer.render(scene, camera);

      const w = canvas.clientWidth, h = canvas.clientHeight, small = w < 520;
      const placed = [];
      Object.entries(pins).forEach(([id, b]) => {
        const lb = lmBox[id];
        tmp.set(lb.c.x, lb.top + 0.35 + island.position.y, lb.c.z).project(camera);
        const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05 && island.position.y > -1;
        b.style.opacity = !vis ? '0' : current === id ? '1' : small ? '0' : current === 'overview' ? '1' : '.55';
        b.style.pointerEvents = b.style.opacity === '0' ? 'none' : 'auto';
        b._x = (tmp.x + 1) / 2 * w; b._y = (1 - tmp.y) / 2 * h;
      });
      Object.values(pins).sort((a, b) => a._y - b._y).forEach(b => {
        const bw = b.offsetWidth || 90;
        placed.forEach(p => { if (Math.abs(p.x - b._x) < (p.w + bw) / 2 + 4 && Math.abs(p.y - b._y) < 24) b._y = p.y + 24; });
        placed.push({ x: b._x, y: b._y, w: bw });
        b.style.left = b._x + 'px'; b.style.top = b._y + 'px';
      });
      requestAnimationFrame(frame);
    }
    running = true;
    requestAnimationFrame(frame);
  }
})();
