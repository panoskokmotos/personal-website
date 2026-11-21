/* Theme behaviour (all pages): calm section reveals, cursor spotlight on cards, hero headline word reveal,
   and live Givelink counts for [data-stat] numbers from assets/givelink-stats.json. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Live counts: set data-target before the counter animation reads it (counters start on scroll).
  const stats = document.querySelectorAll('[data-stat]');
  if (stats.length) {
    fetch('/assets/givelink-stats.json').then(r => r.json()).then(s => {
      const k = { peopleK: s.people, productsK: s.products, donationsK: s.donations };
      stats.forEach(el => { const v = k[el.dataset.stat]; if (v) el.dataset.target = Math.floor(v / 1000); });
    }).catch(() => {});
  }

  // Hero headline: words rise in one after another.
  document.querySelectorAll('.hero-title').forEach(h => {
    if (reduce || h.dataset.split) return;
    h.dataset.split = '1';
    let i = 0;
    const wrap = (node) => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span'); s.className = 'w'; s.style.animationDelay = (0.08 + i++ * 0.09) + 's'; s.textContent = part; frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(h);
  });

  // Section reveals: gentle fade-up the first time each block enters view.
  if (!reduce && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll('main > section:not(#island) .container > *, .impact-bar-inner > *, .featured-bar > *, .isl-ch');
    if (targets.length) {
      document.documentElement.classList.add('rv-on');
      const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('rv-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
      targets.forEach(el => { el.classList.add('rv'); io.observe(el); });
      // Anything already on screen shows immediately.
      requestAnimationFrame(() => targets.forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('rv-in'); }));
    }
  }

  // Spotlight: cards glow faintly where the cursor is.
  if (matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', ev => {
      const card = ev.target.closest && ev.target.closest('.now-card, .blog-card, .proj-card, .press-card, .award-card, .edu-card, .book-card, .faq-item, .milestone');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
      card.style.setProperty('--my', (ev.clientY - r.top) + 'px');
    }, { passive: true });
  }
})();
