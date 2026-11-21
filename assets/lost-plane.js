/* 404: the little plane from the island, lost in the clouds. "Fly home" sends it off, then goes to /.
   Model: /assets/obj-plane.glb (blender/build_island.py). Works without WebGL: the button is a normal link. */
(function () {
  const sky = document.getElementById('lost-sky');
  const btn = document.getElementById('flyHome');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let flyOff = null;
  if (btn) btn.addEventListener('click', (ev) => {
    try { if (window.posthog && posthog.capture) posthog.capture('404_fly_home', { path: location.pathname }); } catch (e) {}
    if (!flyOff || reduce) return; // plain link
    ev.preventDefault();
    flyOff(() => { location.href = '/'; });
  });
  if (!sky) return;
  const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  load('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
    .then(() => load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'))
    .then(start).catch(() => {});

  function start() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    sky.appendChild(canvas);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 1.2, 9); camera.lookAt(0, 0.3, 0);
    scene.add(new THREE.HemisphereLight(0xdfe7ff, 0x1a2347, 1.0));
    const sun = new THREE.DirectionalLight(0xfff1dc, 1.3); sun.position.set(4, 6, 5); scene.add(sun);

    // Clouds: clusters of low-poly puffs drifting across.
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xf4f7ff, roughness: 1, flatShading: true });
    const puff = new THREE.IcosahedronGeometry(1, 1);
    const clouds = [];
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const m = new THREE.Mesh(puff, cloudMat);
        const s = 0.45 + Math.random() * 0.35;
        m.scale.set(s, s * 0.75, s * 0.7);
        m.position.set(k * 0.55 - 0.8, Math.random() * 0.25, Math.random() * 0.3);
        g.add(m);
      }
      g.position.set(-9 + i * 2.3 + Math.random(), -1.6 + Math.random() * 3.6, -3 + Math.random() * 4.5);
      g.userData.speed = 0.25 + Math.random() * 0.35;
      scene.add(g); clouds.push(g);
    }

    let plane = null, leaving = 0, onGone = null;
    new THREE.GLTFLoader().load('/assets/obj-plane.glb', (gltf) => {
      plane = gltf.scene;
      const box = new THREE.Box3().setFromObject(plane), c = box.getCenter(new THREE.Vector3());
      plane.children.forEach(ch => ch.position.sub(c));
      plane.scale.setScalar(1.6);
      scene.add(plane);
      flyOff = (done) => { leaving = performance.now(); onGone = done; };
    });

    function resize() { const w = sky.clientWidth, h = sky.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    new ResizeObserver(resize).observe(sky); resize();

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05); last = now;
      const t = now / 1000;
      if (!reduce) clouds.forEach(g => { g.position.x += g.userData.speed * dt; if (g.position.x > 10) g.position.x = -10; });
      if (plane) {
        if (leaving) {
          const k = (now - leaving) / 900;
          plane.position.set(1.2 + k * k * 14, 0.4 + k * 3, 0);
          plane.rotation.set(0, 0, 0.35 + k * 0.3);
          if (k >= 1 && onGone) { const f = onGone; onGone = null; f(); }
        } else {
          // Searching: a wobbly figure-eight, banking into the turns.
          const a = reduce ? 0.6 : t * 0.7;
          const x = Math.sin(a) * 3.2, y = 0.3 + Math.sin(a * 2) * 0.6, dx = Math.cos(a) * 3.2;
          plane.position.set(x, y, Math.sin(a * 2) * 0.8);
          plane.rotation.set(0, dx >= 0 ? 0 : Math.PI, -Math.cos(a * 2) * 0.35);
        }
      }
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
