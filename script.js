// ── Navbar: transparent → solid on scroll ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Mobile menu ──
const hamburger = document.getElementById('hamburger');
const navMobile = document.getElementById('nav-mobile');
hamburger.addEventListener('click', () => navMobile.classList.toggle('open'));
navMobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navMobile.classList.remove('open')));

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

// ── Dark / Light mode toggle ──
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

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

// ── Journey Gamification ──
(function() {
  const track   = document.getElementById('milestonesTrack');
  const walker  = document.getElementById('journeyWalker');
  const xpFill  = document.getElementById('journeyXpFill');
  const xpPts   = document.getElementById('journeyXpPts');
  const lvlBadge = document.getElementById('journeyLevelBadge');
  if (!track || !walker) return;

  const LEVELS = [
    [0,   'Lv.1 Explorer'],
    [100, 'Lv.2 Dreamer'],
    [200, 'Lv.3 Builder'],
    [300, 'Lv.4 Achiever'],
    [400, 'Lv.5 Innovator'],
    [500, 'Lv.6 Leader'],
    [600, 'Lv.7 Visionary'],
    [700, 'Lv.8 Steward'],
    [900, 'Lv.9 Purpose-Driven Leader'],
  ];
  const MAX_XP = 900;

  let totalXp = 800;

  function getLevelLabel(xp) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i][0]) return LEVELS[i][1];
    }
    return LEVELS[0][1];
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

      moveWalkerTo(ms);
      updateXp(totalXp + 100);
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
