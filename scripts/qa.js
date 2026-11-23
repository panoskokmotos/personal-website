// Site quality check (CI): loads each page in Chromium and fails on unreadable text (contrast < 3:1)
// or JavaScript errors. Same rules as the manual audit used during the Nov 2026 redesign.
// Usage: node scripts/qa.js http://127.0.0.1:4173
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const PAGES = ['/', '/about', '/work', '/press', '/now', '/faq', '/goal', '/books', '/podcast', '/beliefs', '/watch', '/el', '/el-work', '/el-about', '/ai-agents'];
(async () => {
  const b = await chromium.launch(process.env.QA_CHANNEL ? { channel: process.env.QA_CHANNEL } : {});
  let failed = 0;
  for (const path of PAGES) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    p.on('pageerror', e => { if (!/platform\.twitter|appendChild|react\.dev\/errors/.test(e.stack || e.message)) errs.push(e.message); });
    await p.addInitScript(() => { try { localStorage.setItem('cookie_consent', 'declined'); sessionStorage.setItem('confetti_done', '1'); } catch (e) {} });
    await p.goto(BASE + path, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    await p.addStyleTag({ content: '.rv,[data-animate],.blog-card{opacity:1!important;transform:none!important;animation:none!important;transition:none!important}' });
    const bad = await p.evaluate(() => {
      const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
      const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const bgOf = el => { const layers = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const c = parse(cs.backgroundColor); if (cs.backgroundImage !== 'none' && !cs.backgroundImage.includes('420px circle')) return null; if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; } } let o = { r: 255, g: 255, b: 255 }; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; o = { r: c.r * c.a + o.r * (1 - c.a), g: c.g * c.a + o.g * (1 - c.a), b: c.b * c.a + o.b * (1 - c.a) }; } return o; };
      const out = [];
      document.querySelectorAll('body *').forEach(el => {
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)) return;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < 0.1) return;
        if (el.closest('#page-loader,#chatWidget,#chatPanel,#cookieBanner,canvas,.isl-pins,[aria-hidden="true"],[hidden]')) return;
        const fg = parse(cs.color), bg = bgOf(el); if (!fg || !bg) return;
        const f = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
        const L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (ratio < 3) out.push(ratio.toFixed(2) + ' ' + el.tagName.toLowerCase() + '.' + [...el.classList].join('.') + ' "' + el.textContent.trim().slice(0, 40) + '"');
      });
      return out;
    });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const problems = [...bad.map(x => 'contrast ' + x), ...errs.map(e => 'js error ' + e), ...(overflow ? ['horizontal scroll'] : [])];
    console.log((problems.length ? 'FAIL ' : 'ok   ') + path + (problems.length ? '\n  ' + problems.slice(0, 8).join('\n  ') : ''));
    failed += problems.length ? 1 : 0;
    await p.close();
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
