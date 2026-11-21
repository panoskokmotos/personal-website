/* Page objects: one small 3D model per page, taken from the island (blender/build_island.py exports them).
   Markup: <div class="page-3d" data-3d="temple"></div> → loads /assets/obj-temple.glb.
   It turns slowly, can be spun by dragging, follows the site theme, and pauses off-screen.
   Three.js loads only when the element is near the viewport. */
(function () {
  const els = Array.from(document.querySelectorAll('[data-3d]'));
  if (!els.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light';
  const load = (src) => new Promise((res, rej) => {
    if (document.querySelector('script[src="' + src + '"]')) { const w = () => (window.THREE && (src.indexOf('GLTF') < 0 || THREE.GLTFLoader)) ? res() : setTimeout(w, 50); return w(); }
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  let libs = null;
  const three = () => libs || (libs = load('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
    .then(() => load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js')));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); three().then(() => mount(e.target)).catch(() => {}); } });
  }, { rootMargin: '400px 0px' });
  els.forEach(el => io.observe(el));

  function mount(el) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab';
    el.appendChild(canvas);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { el.remove(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const hemi = new THREE.HemisphereLight(0xdfefff, 0x6f6150, 1.0);
    const key = new THREE.DirectionalLight(0xfff1dc, 1.4); key.position.set(4, 6, 5);
    const rim = new THREE.DirectionalLight(0x6090ff, 0.6); rim.position.set(-5, 2, -4);
    scene.add(hemi, key, rim);
    const pivot = new THREE.Group(); scene.add(pivot);
    const glows = [];

    new THREE.GLTFLoader().load('/assets/obj-' + el.dataset['3d'] + '.glb', (gltf) => {
      const obj = gltf.scene;
      obj.traverse(o => {
        if (!o.isMesh) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          if (m.metalness > 0.2) { m.metalness = 0.2; m.roughness = Math.max(m.roughness, 0.35); } // no env map: keep metal readable
          if (m.emissive && m.emissiveIntensity > 0 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0) glows.push(m);
        });
      });
      // Centre on the pivot and frame it whatever its size.
      const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      obj.position.sub(c);
      pivot.add(obj);
      const r = size.length() / 2;
      camera.position.set(0, r * 0.55, r * 3.1);
      camera.lookAt(0, 0, 0);
      el.classList.add('is-loaded');
    });

    // Drag to spin with a little momentum; otherwise turn slowly.
    let dragging = false, lastX = 0, vel = 0;
    canvas.addEventListener('pointerdown', ev => { dragging = true; lastX = ev.clientX; canvas.setPointerCapture(ev.pointerId); canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointermove', ev => { if (!dragging) return; const dx = ev.clientX - lastX; lastX = ev.clientX; pivot.rotation.y += dx * 0.012; vel = dx * 0.012; });
    canvas.addEventListener('pointerup', () => { dragging = false; canvas.style.cursor = 'grab'; });

    function resize() { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    new ResizeObserver(resize).observe(el); resize();

    let visible = true, running = false, last = performance.now();
    new IntersectionObserver(e => { visible = e[e.length - 1].isIntersecting; if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }).observe(el);
    function frame(now) {
      if (!visible) { running = false; return; }
      running = true;
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05); last = now;
      if (!dragging && !reduce) { vel *= 0.94; pivot.rotation.y += 0.35 * dt + vel; }
      pivot.position.y = reduce ? 0 : Math.sin(now / 1000 * 1.2) * 0.04;
      const dark = isDark();
      hemi.intensity = dark ? 0.85 : 1.0;
      glows.forEach(m => { m.emissiveIntensity = dark ? 3 : 1.2; });
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    running = true; requestAnimationFrame(frame);
  }
})();
