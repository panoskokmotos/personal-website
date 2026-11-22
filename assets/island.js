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
  const LABELS = Object.assign({ education: 'Patras', podcast: 'Podcast', givelink: 'Givelink', recognition: 'Recognition', sf: 'San Francisco', aiops: 'AI agents', oss: 'Open source' }, (() => { try { return JSON.parse(section.dataset.labels || '{}'); } catch (e) { return {}; } })());

  const track = (event, props) => { try { if (window.posthog && posthog.capture) posthog.capture(event, props); } catch (e) {} };
  const goToChapter = (id) => { const el = document.getElementById('isl-' + id); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); };

  fetch('assets/givelink-stats.json').then(r => r.json()).then(s => {
    if (countEl && s.liveNonprofits) countEl.textContent = s.liveNonprofits;
    section.querySelectorAll('.isl-count-gr').forEach(e => { if (s.gr) e.textContent = s.gr; });
    section.querySelectorAll('.isl-count-us').forEach(e => { if (s.us) e.textContent = s.us; });
  }).catch(() => {});

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  const near = new IntersectionObserver((entries) => {
    if (!entries.some(e => e.isIntersecting)) return;
    near.disconnect();
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
      .then(() => loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'))
      .then(() => loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/meshopt_decoder.js'))
      .then(init).catch(() => {});
  }, { rootMargin: '800px 0px' });
  near.observe(section);

  // Phones: the hero (name + chat) goes above the island panel, not below it.
  if (matchMedia('(max-width: 860px)').matches) { const hero = section.querySelector('.isl-hero'), layout = section.querySelector('.isl-layout'); if (hero && layout) { hero.classList.add('isl-hero-top'); section.insertBefore(hero, layout); } }

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
    // Night when the site is in dark mode, or (if the visitor never chose) when it's night where they are.
    const isDark = () => { const t = document.documentElement.getAttribute('data-theme'); let saved = null; try { saved = localStorage.getItem('site_theme'); } catch (e) {} if (t === 'dark') return true; if (saved) return false; const h = new Date().getHours(); return h < 6 || h >= 20; };

    // Stars for the dark (night) theme.
    const starPos = [];
    for (let i = 0; i < 500; i++) { const r = 45 + Math.random() * 30, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1); starPos.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)); }
    const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe7ff, size: 0.35, transparent: true, opacity: 0.8 }));
    scene.add(stars);

    const island = new THREE.Group();
    scene.add(island);
    const landmarks = {}, lmBox = {}, pins = {}, spinY = [], spinZ = [], glows = [], clouds = [], windowMats = [], bars = [], people = [], drones = [];
    let groundSF = null, cableCar = null, droneProto = null;
    let van = null, plane = null, arm = null, ground = null, gift = null, ready = false;

    const OVERVIEW = { target: new THREE.Vector3(6.2, 0.2, -0.8), offset: new THREE.Vector3(20, 17, 31) };
    let goal = OVERVIEW, yaw = 0, pitch = 0, zoom = 1, current = 'overview';
    const trucks = [], lanternMeshes = [];
    let lanternTotal = 0, lanternT0 = 0;
    const curTarget = OVERVIEW.target.clone(), curOffset = OVERVIEW.offset.clone().multiplyScalar(1.4);
    const par = new THREE.Vector2(), parGoal = new THREE.Vector2();

    // Every chapter is seen from the same front angle as the overview, just closer, so the story reads as one camera move.
    const FRONT = OVERVIEW.offset.clone().normalize();
    const DIST = { sf: 12, aiops: 11, givelink: 9, education: 8.5, podcast: 8.5, recognition: 8.5, oss: 8.5 };
    function shotFor(id) {
      const b = lmBox[id];
      if (!b) return OVERVIEW;
      const t = b.c.clone(); t.y = b.base + (id === 'sf' ? 0.9 : 1.1);
      return { target: t, offset: FRONT.clone().multiplyScalar(DIST[id] || 9) };
    }

    // Deterministic random so lanterns stay put between visits.
    let seed = 20261121;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const down = new THREE.Raycaster();
    const groundY = (x, z) => { down.set(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0)); const h = down.intersectObjects([ground, groundSF].filter(Boolean), true)[0]; return h ? h.point.y - island.position.y : 0.1; }; // island-local height (the island may still be rising)

    // Road for the van, from the island edge to the Givelink door (three.js coords: x, -blenderY).
    const ROAD = [[-2.0, 5.2], [-1.4, 4.2], [-0.85, 3.2], [-0.3, 2.2], [0.3, 1.35]];
    let road = null;

    // Lanterns: one per live nonprofit, Greek ones on the Greek island, US ones on the San Francisco island.
    function addLanterns(gr, us) {
      const pts = [];
      const scatter = (count, cx, cz, rad) => {
        let guard = 0, made = 0;
        while (made < count && guard++ < 6000) {
          const a = rnd() * Math.PI * 2, r = rad * Math.sqrt(0.06 + 0.94 * rnd());
          const x = cx + r * Math.cos(a), z = cz + r * Math.sin(a);
          if (Object.values(lmBox).some(b => x > b.min.x - 0.25 && x < b.max.x + 0.25 && z > b.min.z - 0.25 && z < b.max.z + 0.25)) continue;
          if (ROAD.some(p => Math.hypot(x - p[0], z - p[1]) < 0.55)) continue;
          if (pts.some(p => Math.hypot(x - p.x, z - p.z) < 0.26)) continue;
          pts.push({ x, z, y: groundY(x, z) }); made++;
        }
      };
      scatter(gr, 0, 0, 5.0);
      scatter(us, 13.2, 1.0, 2.75);
      const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.022, 0.32, 5), new THREE.MeshStandardMaterial({ color: 0x1a2347, roughness: 0.6 }), pts.length);
      const bulbMat = new THREE.MeshStandardMaterial({ color: 0xf4a924, emissive: 0xf4a924, emissiveIntensity: 1.2, roughness: 0.4 });
      const bulb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), bulbMat, pts.length);
      const m = new THREE.Matrix4();
      pts.forEach((p, i) => { m.makeTranslation(p.x, p.y + 0.16, p.z); post.setMatrixAt(i, m); m.makeTranslation(p.x, p.y + 0.36, p.z); bulb.setMatrixAt(i, m); });
      island.add(post, bulb);
      post.count = bulb.count = 0; lanternMeshes.push(post, bulb); lanternTotal = pts.length; lanternT0 = performance.now();
      glows.push(bulbMat);
    }

    // Agent drones: copies of the Blender DRONE fly loops from the HQ to the Givelink house, the nonprofits and San Francisco.
    function setupDrones() {
      const pad = droneProto.position.clone();
      const house = lmBox.givelink ? lmBox.givelink.c.clone().setY(lmBox.givelink.top + 0.6) : new THREE.Vector3(0, 2, 0);
      const sf = lmBox.sf ? lmBox.sf.c.clone().setY(lmBox.sf.top - 0.6) : new THREE.Vector3(13, 2, 1);
      const spots = [[-2.5, 3.2], [2.8, -2.4], [-3.4, -1.6], [12.2, 2.2], [14.4, 0.0], [1.5, 3.8]];
      const routes = [
        [house, spots[0], spots[1]], [sf, spots[3], spots[4]], [house, sf], [spots[2], house, spots[5]], [sf, spots[4], house],
      ];
      routes.forEach((stops, i) => {
        const d = i === 0 ? droneProto : droneProto.clone();
        if (i) droneProto.parent.add(d);
        const pts = [pad.clone().add(new THREE.Vector3(0, 0.6, 0))];
        stops.forEach(sp => {
          const v = Array.isArray(sp) ? new THREE.Vector3(sp[0], groundY(sp[0], sp[1]) + 0.9, sp[1]) : sp.clone();
          pts.push(v.clone().add(new THREE.Vector3(0, 1.6, 0)), v);
        });
        const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
        const rotors = []; d.traverse(o => { if (o.name && o.name.startsWith('ROTOR')) rotors.push(o); });
        drones.push({ d, curve, rotors, speed: 0.018 + i * 0.003, off: i / routes.length });
      });
    }

    const gl = new THREE.GLTFLoader(); if (window.MeshoptDecoder) gl.setMeshoptDecoder(window.MeshoptDecoder);
    gl.load('assets/island.glb', (gltf) => {
      const root = gltf.scene;
      root.traverse(o => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true;
          if (o.geometry && o.geometry.attributes.color) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.vertexColors = true; });
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
        else if (n === 'ISLAND_sf') groundSF = o;
        else if (n.startsWith('BAR_')) bars.push(o);
        else if (n.startsWith('PERSON')) people.push({ o, y: o.position.y, p: Math.random() * 6 });
        else if (n === 'CABLECAR') cableCar = { o, x: o.position.x };
        else if (n === 'DRONE') droneProto = o;
        else if (n.startsWith('TRUCK_')) trucks.push({ o, kind: n.slice(6) });
        if (n.startsWith('GLOW_')) o.traverse(m => { if (m.isMesh) glows.push(m.material); });
      });
      island.add(root);
      island.updateMatrixWorld(true);
      Object.entries(landmarks).forEach(([id, o]) => {
        const box = new THREE.Box3().setFromObject(o);
        lmBox[id] = { c: box.getCenter(new THREE.Vector3()), base: box.min.y, top: box.max.y, min: box.min.clone(), max: box.max.clone() };
      });
      road = new THREE.CatmullRomCurve3(ROAD.map(p => new THREE.Vector3(p[0], groundY(p[0], p[1]) + 0.02, p[1])));
      const lane = pts => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], groundY(p[0], p[1]) + 0.02, p[1])));
      trucks.forEach(tr => { tr.curve = tr.kind === 'gr' ? lane([[-4.7, 0.9], [-3.4, 1.0], [-2.2, 1.15], [-1.1, 1.25]]) : lane([[10.5, 1.05], [11.8, 1.2], [13.1, 1.3], [14.3, 1.1]]); tr.speed = tr.kind === 'gr' ? 0.07 : 0.06; tr.off = tr.kind === 'gr' ? 0.3 : 0; });
      if (plane) scene.add(plane); // the plane flies in world space, not with the bobbing island
      gift = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), new THREE.MeshStandardMaterial({ color: 0xf4a924, emissive: 0xf4a924, emissiveIntensity: 0 }));
      gift.visible = false; island.add(gift);
      fetch('assets/givelink-stats.json').then(r => r.json()).then(s => addLanterns(Math.min(s.gr || 0, 200), Math.min(s.us || 0, 200))).catch(() => addLanterns(55, 100));
      if (droneProto) setupDrones();
      setupExtras();

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
        if (touring) return;
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
    // Orbit, tilt and zoom. Drag = rotate (sideways) and tilt (up/down); pinch or Ctrl/⌘ + scroll = zoom.
    const touches = new Map(); let pinch0 = 0, zoom0 = 1, lastY = 0;
    const clampZoom = z => Math.min(2.2, Math.max(0.35, z));
    canvas.addEventListener('pointerdown', () => { if (touring) stopTour(); });
    canvas.addEventListener('pointerdown', ev => { touches.set(ev.pointerId, ev); dragging = true; moved = 0; lastX = ev.clientX; lastY = ev.clientY; canvas.setPointerCapture(ev.pointerId);
      if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); zoom0 = zoom; } });
    canvas.addEventListener('pointermove', ev => {
      const r = canvas.getBoundingClientRect();
      if (ev.pointerType === 'mouse') parGoal.set(((ev.clientX - r.left) / r.width) * 2 - 1, ((ev.clientY - r.top) / r.height) * 2 - 1);
      if (touches.has(ev.pointerId)) touches.set(ev.pointerId, ev);
      if (touches.size === 2 && pinch0) { const [a, b] = [...touches.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); zoom = clampZoom(zoom0 * pinch0 / d); moved = 99; return; }
      if (dragging) {
        const dx = ev.clientX - lastX, dy = ev.clientY - lastY; lastX = ev.clientX; lastY = ev.clientY; moved += Math.abs(dx) + Math.abs(dy);
        yaw -= dx * 0.006;
        if (ev.pointerType === 'mouse') pitch = Math.max(-0.5, Math.min(0.7, pitch + dy * 0.004));
      } else if (ev.pointerType === 'mouse') canvas.style.cursor = hitLandmark(ev) ? 'pointer' : '';
    });
    const endPtr = ev => { touches.delete(ev.pointerId); if (touches.size < 2) pinch0 = 0; };
    canvas.addEventListener('pointerleave', () => parGoal.set(0, 0));
    canvas.addEventListener('pointercancel', endPtr);
    canvas.addEventListener('pointerup', ev => {
      endPtr(ev); dragging = touches.size > 0;
      if (moved < 6) { const id = hitLandmark(ev); if (id) { track('island_landmark_click', { landmark: id, via: '3d' }); stopTour(); openCard(id); } else closeCard(); }
    });
    canvas.addEventListener('wheel', ev => {
      if (!(ev.ctrlKey || ev.metaKey)) { hint.classList.add('show'); clearTimeout(hint._t); hint._t = setTimeout(() => hint.classList.remove('show'), 1400); return; }
      ev.preventDefault(); zoom = clampZoom(zoom * Math.exp(ev.deltaY * 0.0025));
    }, { passive: false });
    canvas.addEventListener('dblclick', () => { yaw = 0; pitch = 0; zoom = 1; });

    // On-screen controls: zoom out/in, reset, day/night, ambient sound.
    const bar = document.createElement('div'); bar.className = 'isl-ctrl';
    bar.innerHTML = '<button type="button" data-a="tour" aria-label="Play the guided tour">▶</button><button type="button" data-a="out" aria-label="Zoom out">−</button><button type="button" data-a="in" aria-label="Zoom in">+</button><button type="button" data-a="reset" aria-label="Reset view">⟲</button><button type="button" data-a="night" aria-label="Day or night">☾</button><button type="button" data-a="sound" aria-label="Ambient sound" aria-pressed="false">♪</button>';
    stage.appendChild(bar);
    const hint = document.createElement('div'); hint.className = 'isl-zoomhint'; hint.textContent = navigator.platform.includes('Mac') ? 'Hold ⌘ and scroll to zoom' : 'Hold Ctrl and scroll to zoom'; stage.appendChild(hint);
    let audio = null;
    bar.addEventListener('click', ev => {
      const a = ev.target.closest('button') && ev.target.closest('button').dataset.a; if (!a) return;
      if (a === 'tour') { touring ? stopTour() : startTour(); }
      if (a === 'in') zoom = clampZoom(zoom / 1.25);
      if (a === 'out') zoom = clampZoom(zoom * 1.25);
      if (a === 'reset') { yaw = 0; pitch = 0; zoom = 1; }
      if (a === 'night') { const dark = isDark(); window.setSiteTheme ? window.setSiteTheme(dark ? 'light' : 'dark') : document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark'); }
      if (a === 'sound') { audio = audio || makeAmbience(); const on = audio.toggle(); ev.target.setAttribute('aria-pressed', String(on)); track('island_sound', { on }); }
      track('island_control', { action: a });
    });

    // Gentle sea-and-wind ambience made in the browser (no audio files); starts only when asked.
    function makeAmbience() {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return { toggle: () => false };
      const ctx = new Ctx(), len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      const gain = ctx.createGain(); gain.gain.value = 0;
      const lfo = ctx.createOscillator(), lfoGain = ctx.createGain(); lfo.frequency.value = 0.12; lfoGain.gain.value = 0.05; lfo.connect(lfoGain).connect(gain.gain);
      src.connect(lp).connect(gain).connect(ctx.destination); src.start(); lfo.start();
      let on = false;
      return { toggle() { on = !on; ctx.resume(); gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.linearRampToValueAtTime(on ? 0.09 : 0, ctx.currentTime + 0.8); return on; } };
    }


    // ── Landmark cards, guided tour, photo billboards, seasons, cloud fade ──
    const ORDER = ['education', 'podcast', 'givelink', 'recognition', 'sf', 'aiops', 'oss'];
    const card = document.createElement('div'); card.className = 'isl-card'; card.hidden = true; stage.appendChild(card);
    let cardId = null, touring = false, tourI = 0, tourT = 0;
    function openCard(id) {
      const ch = document.getElementById('isl-' + id); if (!ch) return;
      cardId = id; goal = shotFor(id); current = id; yaw = 0;
      const eb = ch.querySelector('.isl-eyebrow'), h = ch.querySelector('h3'), li = ch.querySelector('li'), more = ch.querySelector('.isl-more');
      card.innerHTML = '';
      const e1 = document.createElement('span'); e1.className = 'isl-card-eb'; e1.textContent = eb ? eb.textContent : '';
      const e2 = document.createElement('strong'); e2.textContent = h ? h.textContent : '';
      const e3 = document.createElement('p'); e3.textContent = li ? li.textContent : '';
      const row = document.createElement('div'); row.className = 'isl-card-row';
      const read = document.createElement('button'); read.type = 'button'; read.textContent = section.dataset.read || 'Read the chapter'; read.addEventListener('click', () => { stopTour(); closeCard(); goToChapter(id); });
      row.appendChild(read);
      if (more) { const a = document.createElement('a'); a.href = more.href; a.textContent = more.textContent; if (more.target) a.target = more.target; row.appendChild(a); }
      const x = document.createElement('button'); x.type = 'button'; x.className = 'isl-card-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '×'; x.addEventListener('click', () => { stopTour(); closeCard(); });
      card.append(x, e1, e2, e3, row); card.hidden = false;
      Object.entries(pins).forEach(([pid, b]) => b.setAttribute('aria-current', String(pid === id)));
    }
    function closeCard() { card.hidden = true; cardId = null; }
    function startTour() { touring = true; tourI = 0; tourT = performance.now(); openCard(ORDER[0]); bar.querySelector('[data-a="tour"]').textContent = '❚❚'; track('island_tour', { action: 'start' }); }
    function stopTour() { if (!touring) return; touring = false; bar.querySelector('[data-a="tour"]').textContent = '▶'; track('island_tour', { action: 'stop', step: tourI }); }
    addEventListener('wheel', () => { if (touring) stopTour(); }, { passive: true });
    // pins open cards too
    pinsEl.addEventListener('click', ev => { const b = ev.target.closest('.isl-pin'); if (!b) return; ev.stopImmediatePropagation(); const id = Object.keys(pins).find(k => pins[k] === b); if (id) { stopTour(); openCard(id); } }, true);

    const boards = [], season = { snow: null, lights: [] };
    let cloudMats = [];
    function setupExtras() {
      island.traverse(o => { if (o.isMesh && o.parent && o.parent.name && o.parent.name.startsWith('CLOUD_')) { o.material = o.material.clone(); o.material.transparent = true; cloudMats.push(o.material); } });
      // Photo billboards: one per island, cycling through photos nonprofits published on Givelink.
      fetch('/assets/photos/photos.json').then(r => r.json()).then(list => {
        const loader = new THREE.TextureLoader();
        [['GR', 3.2, 1.6], ['US', 15.0, 2.0]].forEach(([reg, x, z]) => {
          const pics = list.filter(p => p.region === reg); if (!pics.length) return;
          const texs = pics.map(p => { const t = loader.load(p.src); t.encoding = THREE.sRGBEncoding; return t; });
          const g = new THREE.Group(); const y = groundY(x, z);
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0x1a2347 })); post.position.y = 0.55; g.add(post);
          const frame = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.96, 0.06), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })); frame.position.y = 1.45; g.add(frame);
          const face = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.84), new THREE.MeshBasicMaterial({ map: texs[0], toneMapped: false })); face.position.set(0, 1.45, 0.035); g.add(face);
          g.position.set(x, y, z); g.rotation.y = Math.atan2(FRONT.x, FRONT.z);
          island.add(g); boards.push({ face, texs, i: 0 });
        });
      }).catch(() => {});
      // Holiday season (Nov 20 to Jan 6): snow and string lights.
      const d = new Date(), md = (d.getMonth() + 1) * 100 + d.getDate();
      if (md >= 1120 || md <= 106) {
        const n = 900, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { pos[i * 3] = -8 + Math.random() * 26; pos[i * 3 + 1] = Math.random() * 12 - 2; pos[i * 3 + 2] = -9 + Math.random() * 16; }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        season.snow = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.9 }));
        scene.add(season.snow);
        const cols = [0xf4a924, 0xe0357a, 0x3b6ef8, 0x6fae8a];
        const strand = (cx, cz, r, y, count) => { for (let i = 0; i < count; i++) { const a = i / count * Math.PI * 2; const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshStandardMaterial({ color: cols[i % 4], emissive: cols[i % 4], emissiveIntensity: 2 })); m.position.set(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r); island.add(m); season.lights.push(m); } };
        if (lmBox.givelink) strand(lmBox.givelink.c.x, lmBox.givelink.c.z, 1.25, lmBox.givelink.base + 1.35, 28);
        if (lmBox.sf) strand(lmBox.sf.c.x, lmBox.sf.c.z, 1.8, lmBox.sf.base + 0.9, 36);
      }
      // GivingTuesday (Dec 1, 2026): a banner with the running donation count from the daily stats file.
      if (md >= 1123 && md <= 1202) fetch('/assets/givelink-stats.json').then(r => r.json()).then(st => {
        const b = document.createElement('div'); b.className = 'isl-banner';
        b.textContent = (section.dataset.gt || 'GivingTuesday is Dec 1 · {n} donations through Givelink so far').replace('{n}', (Math.floor((st.donations || 0) / 100) * 100).toLocaleString() + '+');
        stage.appendChild(b);
      }).catch(() => {});
    }
    function extrasFrame(now, dt) {
      const t = now / 1000;
      boards.forEach(b => { const k = Math.floor(t / 5) % b.texs.length; if (k !== b.i && b.texs[k].image) { b.i = k; b.face.material.map = b.texs[k]; b.face.material.needsUpdate = true; } });
      if (season.snow && !reduce) { const a = season.snow.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * 0.6; if (y < -3) y = 10; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t + i) * dt * 0.05); } a.needsUpdate = true; }
      season.lights.forEach((m, i) => { m.material.emissiveIntensity = reduce ? 2 : 1.2 + Math.sin(t * 3 + i) * 1.0; });
      const dist = camera.position.distanceTo(curTarget);
      cloudMats.forEach(m => { m.opacity = Math.min(1, Math.max(0.12, (dist - 7) / 14)); });
      if (touring && now - tourT > 4500) { tourT = now; tourI++; if (tourI >= ORDER.length) { stopTour(); closeCard(); goal = OVERVIEW; } else openCard(ORDER[tourI]); }
    }

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

    const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), sph = new THREE.Spherical();
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
      tmp.copy(curOffset).multiplyScalar(narrow * zoom);
      sph.setFromVector3(tmp); sph.theta += yaw + par.x * 0.12; sph.phi = Math.min(1.5, Math.max(0.18, sph.phi - pitch + par.y * 0.05)); tmp.setFromSpherical(sph);
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
          drones.forEach(dr => {
            const u = (t * dr.speed + dr.off) % 1, p = dr.curve.getPointAt(u), tan = dr.curve.getTangentAt(u);
            dr.d.position.copy(p); dr.d.rotation.set(0, Math.atan2(-tan.z, tan.x), 0);
            dr.rotors.forEach(r => { r.rotation.y += dt * 40; });
          });
          trucks.forEach(tr => { if (!tr.curve) return; const c = (t * tr.speed + tr.off) % 1, u = c < 0.5 ? c * 2 : 2 - c * 2, p = tr.curve.getPointAt(Math.min(0.999, Math.max(0.001, u))), tan = tr.curve.getTangentAt(Math.min(0.999, Math.max(0.001, u))); if (c >= 0.5) tan.negate(); tr.o.position.copy(p); tr.o.rotation.set(0, Math.atan2(-tan.z, tan.x), 0); });
          bars.forEach((b, i) => { b.scale.y = 0.85 + 0.25 * (0.5 + 0.5 * Math.sin(t * 0.8 - i * 0.6)) * (1 + i * 0.15); });
          if (cableCar) cableCar.o.position.x = cableCar.x + 1.25 + Math.sin(t * 0.35) * 1.25;
          people.forEach(pp => { pp.o.position.y = pp.y + Math.abs(Math.sin(t * 2.2 + pp.p)) * 0.04; });
          if (plane) {
            const a = t * 0.16, cx = 6.6, cz = -0.6, rx = 13.5, rz = 8.5;
            plane.position.set(cx + rx * Math.cos(a), 5.2 + Math.sin(a * 2) * 0.7, cz + rz * Math.sin(a));
            const vx = -rx * Math.sin(a), vz = rz * Math.cos(a);
            plane.rotation.set(0, Math.atan2(-vz, vx), 0);
            plane.rotateX(-0.25);
          }
        } else if (van && road) { const p = road.getPointAt(1); van.position.copy(p); }
        if (lanternTotal) { const n = reduce ? lanternTotal : Math.min(lanternTotal, Math.floor((now - lanternT0) / 18)); lanternMeshes.forEach(m => { m.count = n; }); }
        const dark = isDark();
        hemi.intensity = dark ? 0.75 : 0.9; hemi.color.setHex(dark ? 0x9fb4ff : 0xdfefff);
        sun.intensity = dark ? 0.45 : 1.6; sun.color.setHex(dark ? 0xb8c8ff : 0xfff1dc);
        stars.visible = dark;
        stage.classList.toggle('isl-night', dark);
        windowMats.forEach(m => { m.emissive.setHex(dark ? 0xf4a924 : 0x000000); m.emissiveIntensity = dark ? 1.4 : 0; });
        glows.forEach(m => { if (m.emissive) m.emissiveIntensity = (dark ? 3 : 1.2) * (reduce ? 1 : 0.8 + 0.2 * Math.sin(t * 2.2)); });
      }
      extrasFrame(now, dt);
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
