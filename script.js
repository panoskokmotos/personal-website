// ── Navbar: transparent → solid on scroll ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Mobile menu ──
const hamburger = document.getElementById('hamburger');
const navMobile = document.getElementById('nav-mobile');
const navMobileClose = document.getElementById('navMobileClose');

function closeMenu() {
  navMobile.classList.remove('open');
  hamburger.classList.remove('active');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.setAttribute('aria-label', 'Menu');
}

hamburger.addEventListener('click', () => {
  const isOpen = navMobile.classList.toggle('open');
  hamburger.classList.toggle('active', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
  hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Menu');
});
if (navMobileClose) {
  navMobileClose.addEventListener('click', closeMenu);
}
// Close when clicking outside
document.addEventListener('click', (e) => {
  if (navMobile.classList.contains('open') &&
      !navMobile.contains(e.target) &&
      !hamburger.contains(e.target)) {
    closeMenu();
  }
});
navMobile.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

// ── Scroll-triggered fade-in ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-animate], .timeline-item, .edu-card, .award-card, .project-card, .book-card, .milestone, .press-card').forEach(el => observer.observe(el));

// ── Animated counters ──
function animateCounter(el) {
  const target = +el.dataset.target;
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();
  const step = now => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(eased * target);
    const formatted = value >= 1000 ? Math.floor(value / 1000) + 'K' : value;
    el.textContent = prefix + formatted + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { animateCounter(e.target); counterObserver.unobserve(e.target); }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.impact-num').forEach(el => counterObserver.observe(el));

// ── Active nav link on scroll ──
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => {
        a.style.color = '';
        if (a.getAttribute('href') === '#' + e.target.id) a.style.color = '#fff';
      });
    }
  });
}, { threshold: 0.4 });
sections.forEach(s => sectionObserver.observe(s));

// ── Theme: dark mode locked ──
document.documentElement.setAttribute('data-theme', 'dark');

// ── Scroll progress bar ──
const progressBar = document.getElementById('progress-bar');
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';
}, { passive: true });

// ── Confetti on first visit (session-gated) ──
(function () {
  if (sessionStorage.getItem('confetti_done')) return;
  sessionStorage.setItem('confetti_done', '1');

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = ['#3b6ef8', '#d4af37', '#10b981', '#f43f5e', '#8b5cf6', '#f97316'];
  const pieces = Array.from({ length: 65 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 6 + 3,
    d: Math.random() * 80 + 20,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    tilt: Math.random() * 10 - 10,
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.1 + 0.05,
  }));

  let frame = 0;
  let anim;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.tiltAngle += p.tiltSpeed;
      p.y += (Math.cos(frame / 10 + p.d) + 2.5);
      p.x += Math.sin(frame / 10) * 0.8;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });
    frame++;
    if (frame < 140) {
      anim = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(anim);
      canvas.remove();
    }
  }
  draw();
})();

// ── Book cover placeholder detection (Open Library returns 1px gif for missing covers) ──
document.querySelectorAll('.book-cover-img').forEach(img => {
  const checkSize = () => {
    if (img.naturalWidth < 10 || img.naturalHeight < 10) {
      const abbr = img.alt.replace(' cover', '').split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase();
      img.parentElement.innerHTML = `<div class="book-cover-fb">${abbr}</div>`;
    }
  };
  if (img.complete) checkSize();
  else img.addEventListener('load', checkSize);
});

// ── Hero parallax orbs ──
const heroOrbs = document.querySelectorAll('.hero-orb');
if (heroOrbs.length) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    heroOrbs[0] && (heroOrbs[0].style.transform = `translateY(${y * 0.25}px)`);
    heroOrbs[1] && (heroOrbs[1].style.transform = `translateY(${-y * 0.18}px)`);
    heroOrbs[2] && (heroOrbs[2].style.transform = `translate(-50%, calc(-50% + ${y * 0.1}px))`);
  }, { passive: true });
}

// ── Video autoplay on hover (featured iframe only — grid uses façades) ──
document.querySelectorAll('.watch-featured .watch-embed-wrap').forEach(wrap => {
  const iframe = wrap.querySelector('iframe');
  if (!iframe || iframe.closest('.yt-facade')) return;
  const baseSrc = iframe.src.split('?')[0];
  iframe.setAttribute('src', baseSrc);
  let hoverTimer;
  wrap.addEventListener('mouseenter', () => {
    hoverTimer = setTimeout(() => {
      iframe.setAttribute('src', baseSrc + '?autoplay=1&mute=1&rel=0');
    }, 300);
  });
  wrap.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    iframe.setAttribute('src', baseSrc);
  });
});

// ── Journey Gamification ──
(function() {
  const track   = document.getElementById('milestonesTrack');
  const walker  = document.getElementById('journeyWalker');
  const xpFill  = document.getElementById('journeyXpFill');
  const xpPts   = document.getElementById('journeyXpPts');
  const lvlBadge = document.getElementById('journeyLevelBadge');
  const toastWrap = document.getElementById('achievementToasts');
  if (!track) return;

  const LEVELS = [
    [0,   '📖 A curious kid from Patras'],
    [100, '🌱 First steps & small wins'],
    [200, '🎓 Learning, failing, growing'],
    [300, '✨ Finding my purpose'],
    [400, '🚀 Building something real'],
    [500, '🏆 Recognition & momentum'],
    [600, '🌍 Taking it global'],
    [700, '🙏 Grateful & still learning'],
    [800, '⭐ The journey continues…'],
  ];
  const MAX_XP = 800;

  let totalXp = 0;

  function getLevelLabel(xp) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i][0]) return LEVELS[i][1];
    }
    return LEVELS[0][1];
  }

  function showToast(text) {
    if (!toastWrap) return;
    const t = document.createElement('div');
    t.className = 'achievement-toast';
    t.innerHTML = `<span class="toast-icon">🔓</span><span>${text}</span><span class="toast-xp">+100 XP</span>`;
    toastWrap.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function updateXp(newXp) {
    const prevLabel = getLevelLabel(totalXp);
    totalXp = Math.min(newXp, MAX_XP);
    const pct = (totalXp / MAX_XP) * 100;
    if (xpFill) xpFill.style.width = pct + '%';
    if (xpPts) xpPts.textContent = totalXp;
    const newLabel = getLevelLabel(totalXp);
    if (lvlBadge && newLabel !== prevLabel) {
      lvlBadge.textContent = newLabel;
      lvlBadge.classList.remove('level-up');
      void lvlBadge.offsetWidth; // reflow
      lvlBadge.classList.add('level-up');
    }
  }

  // Move walker to milestone
  function moveWalkerTo(milestoneEl) {
    const dotEl = milestoneEl.querySelector('.ms-dot');
    if (!dotEl) return;
    // offsetTop relative to milestones-track
    const msTop  = milestoneEl.offsetTop;
    const dotH   = dotEl.offsetTop; // dot's position within the milestone row
    walker.style.top = (msTop + dotH + 4) + 'px';
  }

  // Observe each milestone for intersection
  const milestones = track.querySelectorAll('.milestone[data-achievement]');
  let lastUnlockedIdx = -1;

  const gameObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const ms = entry.target;
      const idx = Array.from(milestones).indexOf(ms);
      if (idx <= lastUnlockedIdx) return; // already processed
      lastUnlockedIdx = idx;

      if (walker) moveWalkerTo(ms);
      updateXp(totalXp + 100);
      const achievement = ms.dataset.achievement;
      if (achievement) showToast(achievement);
      gameObserver.unobserve(ms);
    });
  }, { threshold: 0.4, rootMargin: '0px 0px -10% 0px' });

  milestones.forEach(ms => gameObserver.observe(ms));

  // Initialize progress and walker
  updateXp(totalXp);
  if (lvlBadge) lvlBadge.textContent = getLevelLabel(totalXp);
  if (milestones.length) moveWalkerTo(milestones[0]);
})();

// ── Contact form async submit ──
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const success = document.getElementById('formSuccess');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        contactForm.reset();
        success.style.display = 'block';
        btn.textContent = 'Sent ✓';
      } else {
        btn.disabled = false;
        btn.textContent = 'Send Message';
        alert('Something went wrong. Please try again.');
      }
    } catch {
      btn.disabled = false;
      btn.textContent = 'Send Message';
      alert('Network error. Please email panagiotis.kokmotoss@gmail.com directly.');
    }
  });
}

// ── Sticky mobile CTA (shows after scrolling past hero) ──
(function() {
  const cta = document.getElementById('stickyCta');
  if (!cta) return;
  const hero = document.getElementById('hero');
  const contact = document.getElementById('contact');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.target === hero && !e.isIntersecting) cta.classList.add('visible');
      if (e.target === hero && e.isIntersecting) cta.classList.remove('visible');
      if (e.target === contact && e.isIntersecting) cta.classList.remove('visible');
    });
  }, { threshold: 0.1 });
  obs.observe(hero);
  if (contact) obs.observe(contact);
  cta.setAttribute('aria-hidden', 'false');
})();

// ── "Now" section — auto date ──
(function() {
  const el = document.getElementById('nowDate');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
})();

// ── Book cover skeleton — mark loaded images ──
document.querySelectorAll('.skeleton-wrap img.book-cover-img').forEach(img => {
  const done = () => img.classList.add('img-loaded');
  if (img.complete && img.naturalWidth > 0) done();
  else img.addEventListener('load', done);
});

// ── Back to top ──
(function() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 600);
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// (hamburger ↔ X handled by closeMenu / main toggle above)

// ── 3D card tilt on project cards ──
(function() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip on touch
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1000px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateZ(6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s var(--ease, ease)';
      setTimeout(() => card.style.transition = '', 400);
    });
  });
})();

// ── Typewriter effect on hero tagline ──
(function() {
  const el = document.getElementById('heroTagline');
  if (!el) return;
  const words = ['Advocate.', 'Changemaker.', 'Builder.'];
  const cursor = document.createElement('span');
  cursor.className = 'hero-tagline-cursor';
  cursor.setAttribute('aria-hidden', 'true');

  let charIdx = 0;
  let wordIdx = 0;
  let typing = true;
  let fullText = words.join(' ');

  // Build full string char by char
  const chars = fullText.split('');
  let displayed = '';

  function tick() {
    if (charIdx < chars.length) {
      displayed += chars[charIdx++];
      el.textContent = displayed;
      el.appendChild(cursor);
      setTimeout(tick, charIdx === chars.length ? 400 : 55);
    } else {
      // Done typing — keep cursor blinking
      el.appendChild(cursor);
    }
  }
  // Small delay before starting
  setTimeout(tick, 600);
})();

// ── YouTube façade: click to load iframe ──
(function() {
  document.querySelectorAll('.yt-facade').forEach(facade => {
    const activate = () => {
      if (facade.classList.contains('yt-active')) return;
      const iframe = facade.querySelector('iframe');
      if (iframe && iframe.dataset.src) {
        iframe.src = iframe.dataset.src;
        facade.classList.add('yt-active');
      }
    };
    facade.addEventListener('click', activate);
    facade.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
  });
})();

// ── Language progress bars (animate on intersection) ──
(function() {
  const bars = document.querySelectorAll('.lang-bar-fill');
  if (!bars.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.width = e.target.dataset.pct + '%';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  bars.forEach(b => obs.observe(b));
})();

// ── Random insight generator (Books section) ──
(function() {
  const btn = document.getElementById('insightBtn');
  const display = document.getElementById('insightDisplay');
  const textEl = document.getElementById('insightText');
  const sourceEl = document.getElementById('insightSource');
  if (!btn) return;

  const insights = [
    { text: '"Play long-term games with long-term people."', source: '— Naval Ravikant · The Almanack of Naval Ravikant' },
    { text: '"Read what you love until you love to read."', source: '— Naval Ravikant · The Almanack of Naval Ravikant' },
    { text: '"You have power over your mind — not outside events. Realise this, and you will find strength."', source: '— Marcus Aurelius · Meditations' },
    { text: '"The obstacle is the way."', source: '— Marcus Aurelius · Meditations' },
    { text: '"Nature does not hurry, yet everything is accomplished."', source: '— Lao Tzu · Tao Te Ching' },
    { text: '"Knowing others is intelligence; knowing yourself is true wisdom."', source: '— Lao Tzu · Tao Te Ching' },
    { text: '"It\'s not what happens to you, but how you react to it that matters."', source: '— Epictetus · Discourses' },
    { text: '"Wealth consists not in having great possessions, but in having few wants."', source: '— Epictetus · Discourses' },
    { text: '"Build unique value instead of competing in crowded markets."', source: '— Peter Thiel · Zero to One' },
    { text: '"Progress is open-ended when societies protect reason and freedom."', source: '— David Deutsch · The Beginning of Infinity' },
    { text: '"Good explanations are hard to vary — that\'s what makes them powerful."', source: '— David Deutsch · The Fabric of Reality' },
    { text: '"AI outcomes depend on proactive design, not passive optimism."', source: '— Max Tegmark · Life 3.0' },
    { text: '"Test assumptions fast before over-investing in execution."', source: '— Eric Ries · The Lean Startup' },
    { text: '"World-class performance is built from repeatable daily systems."', source: '— Tim Ferriss · Tools of Titans' },
    { text: '"Mission-aligned teams can outperform when resources are tight."', source: '— Phil Knight · Shoe Dog' },
  ];

  let lastIdx = -1;
  btn.addEventListener('click', () => {
    let idx;
    do { idx = Math.floor(Math.random() * insights.length); } while (idx === lastIdx);
    lastIdx = idx;
    const { text, source } = insights[idx];
    display.classList.remove('visible');
    // Force reflow for re-animation
    void display.offsetWidth;
    textEl.textContent = text;
    sourceEl.textContent = source;
    display.classList.add('visible');
  });
})();

// ── Cobe globe (about section) ──
(function() {
  const canvas = document.getElementById('globe-canvas');
  if (!canvas) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    import createGlobe from 'https://esm.sh/cobe@0.6.3';
    const canvas = document.getElementById('globe-canvas');
    if (!canvas) return;
    const phi = { value: 0 };
    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio, 2),
      width: 260, height: 260,
      phi: 0.4, theta: 0.2,
      dark: 1, diffuse: 1.2,
      scale: 1,
      mapSamples: 12000,
      mapBrightness: 6,
      baseColor: [0.1, 0.2, 0.6],
      markerColor: [0.23, 0.43, 0.97],
      glowColor: [0.1, 0.2, 0.5],
      markers: [
        { location: [38.2466, 21.7346], size: 0.06 }, // Patras
        { location: [37.9838, 23.7275], size: 0.06 }, // Athens
        { location: [41.3851, 2.1734],  size: 0.05 }, // Barcelona
        { location: [37.7749, -122.4194], size: 0.07 }, // San Francisco
      ],
      onRender(state) {
        state.phi = phi.value;
        phi.value += 0.004;
      }
    });
  `;
  document.head.appendChild(script);
})();

// ── Hero particle canvas ──
(function() {
  const canvas = document.getElementById('hero-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  const COUNT = window.innerWidth < 600 ? 40 : 80;

  function resize() {
    const hero = canvas.closest('#hero') || canvas.parentElement;
    W = canvas.width  = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
  }

  function mkParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.5 + 0.15
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: COUNT }, mkParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139,168,255,${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  draw();
})();

// ── Copy email button ──
document.querySelectorAll('.copy-email-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.dataset.copy;
    if (!text) return;
    const applyFeedback = () => {
      btn.classList.add('copied');
      const copyIcon  = btn.querySelector('.copy-icon');
      const checkIcon = btn.querySelector('.check-icon');
      if (copyIcon)  copyIcon.style.display  = 'none';
      if (checkIcon) checkIcon.style.display = '';
      setTimeout(() => {
        btn.classList.remove('copied');
        if (copyIcon)  copyIcon.style.display  = '';
        if (checkIcon) checkIcon.style.display = 'none';
      }, 1500);
    };
    navigator.clipboard.writeText(text).then(applyFeedback).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      applyFeedback();
    });
  });
});

// ── Spotify lazy facade ──
const spotifyFacade = document.getElementById('spotifyFacade');
if (spotifyFacade) {
  const activate = () => {
    const iframe = spotifyFacade.querySelector('iframe');
    if (!iframe) return;
    iframe.src = iframe.dataset.src;
    spotifyFacade.classList.add('loaded');
  };
  spotifyFacade.addEventListener('click', activate);
  spotifyFacade.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
}

// ── Award flip — touch support (tap to flip on mobile) ──
document.querySelectorAll('.award-flip').forEach(card => {
  card.addEventListener('click', e => {
    // Only toggle on touch devices; desktop uses CSS hover
    if (window.matchMedia('(hover: none)').matches) {
      card.classList.toggle('flipped');
      // If flipped and has link, allow click-through after 300ms
    }
  });
});

// ── Cursor spotlight (desktop only) ──
(function() {
  if (window.matchMedia('(hover: none)').matches) return;
  const el = document.createElement('div');
  el.className = 'cursor-spotlight';
  document.body.appendChild(el);
  document.addEventListener('mousemove', e => {
    el.style.left = e.clientX + 'px';
    el.style.top  = e.clientY + 'px';
  });
  document.addEventListener('mouseleave', () => el.style.opacity = '0');
  document.addEventListener('mouseenter', () => el.style.opacity = '1');
})();

// ── Back-to-top progress ring ──
(function() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  // Inject ring SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('progress-ring');
  svg.setAttribute('viewBox','0 0 40 40');
  svg.innerHTML = '<circle class="ring-track" cx="20" cy="20" r="18"/><circle class="ring-fill" cx="20" cy="20" r="18"/>';
  btn.appendChild(svg);
  const fill = svg.querySelector('.ring-fill');
  const circumference = 2 * Math.PI * 18; // ~113
  fill.style.strokeDasharray = circumference;
  fill.style.strokeDashoffset = circumference;

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = docHeight > 0 ? scrollTop / docHeight : 0;
    fill.style.strokeDashoffset = circumference * (1 - pct);
  }, { passive: true });
})();

// ── Active nav link indicator ──
(function() {
  const sections = document.querySelectorAll('section[id], div[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => observer.observe(s));
})();

// ── Timeline connector draw on scroll ──
(function() {
  const timeline = document.querySelector('#experience .timeline');
  if (!timeline) return;
  function update() {
    const rect = timeline.getBoundingClientRect();
    const visible = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / rect.height));
    timeline.style.setProperty('--draw-pct', Math.round(visible * 100) + '%');
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// ── Timeline active item highlight ──
(function initTimelineActiveHighlight() {
  const items = document.querySelectorAll('.timeline-item');
  if (!items.length) return;

  function updateActiveItem() {
    let closestItem = null;
    let closestDist = Infinity;
    const mid = window.innerHeight / 2;
    items.forEach(item => {
      const rect = item.getBoundingClientRect();
      const itemMid = rect.top + rect.height / 2;
      const dist = Math.abs(itemMid - mid);
      if (dist < closestDist) {
        closestDist = dist;
        closestItem = item;
      }
    });
    items.forEach(item => item.classList.remove('tl-active'));
    if (closestItem) closestItem.classList.add('tl-active');
  }

  // Only activate when experience section is in view
  const section = document.getElementById('experience');
  if (!section) return;

  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        window.addEventListener('scroll', updateActiveItem, { passive: true });
        updateActiveItem();
      } else {
        window.removeEventListener('scroll', updateActiveItem);
        items.forEach(item => item.classList.remove('tl-active'));
      }
    });
  }, { threshold: 0.1 });

  sectionObserver.observe(section);
})();

// ── Scroll progress bar ──
(function initScrollProgress() {
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  document.body.prepend(bar);

  function updateBar() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + '%';
  }

  window.addEventListener('scroll', updateBar, { passive: true });
  updateBar();
})();

// ── Awards show more toggle ──
function toggleAwards(btn) {
  const extra = document.getElementById('awardsExtra');
  if (!extra) return;
  extra.classList.toggle('open');
  btn.classList.toggle('open');
  const isOpen = extra.classList.contains('open');
  const textNode = [...btn.childNodes].find(n => n.nodeType === 3);
  if (textNode) textNode.textContent = isOpen ? 'Show less ' : 'Show all 9 awards ';
  if (isOpen) {
    extra.querySelectorAll('[data-animate]').forEach(el => {
      setTimeout(() => el.classList.add('visible'), 50);
    });
  }
}
