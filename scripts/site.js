// Update the "Last updated" timestamp
(function updateLastUpdated() {
  const el = document.getElementById('last-updated');
  if (!el) return;
  try {
    const d = new Date(document.lastModified);
    el.textContent = d.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit' });
  } catch (_) {
    el.textContent = 'today';
  }
})();

// Hamburger menu for main hub
(function initHubHamburger() {
  const btn = document.getElementById('menu-btn');
  const menu = document.getElementById('site-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // Auto-close on anchor click
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (menu.classList.contains('open')) {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();

// Carousel: preset cards, no user editing
(function initCarousel() {
  const carousel = document.querySelector('.carousel');
  if (!carousel) return;
  const viewport = carousel.querySelector('.carousel-viewport');
  const track = carousel.querySelector('.carousel-track');
  const cards = Array.from(track.querySelectorAll('.carousel-card'));
  const prev = carousel.querySelector('.carousel-nav.prev');
  const next = carousel.querySelector('.carousel-nav.next');

  // Scroll snapping for smooth UX; use buttons to page by viewport
  function page(dir) {
    viewport.scrollBy({ left: dir * viewport.clientWidth, behavior: 'smooth' });
  }
  prev?.addEventListener('click', () => page(-1));
  next?.addEventListener('click', () => page(1));

  // Lazy-load iframes from data-embed when card is near view
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const card = e.target;
        const src = card.getAttribute('data-embed') || '';
        const frame = card.querySelector('iframe');
        const placeholder = card.querySelector('.video-placeholder');
        if (src && frame && !frame.src) {
          frame.src = src;
          placeholder?.classList.add('hidden');
        }
      }
    });
  }, { root: viewport, threshold: 0.4 }) : null;

  cards.forEach(c => io?.observe(c));
})();

// Theme toggle (light/dark with persistence)
(function initTheme() {
  const KEY = 'theme-preference';
  const html = document.documentElement;
  const btn = document.getElementById('theme-toggle');

  function apply(theme) {
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
      if (btn) btn.textContent = '🌙 Dark';
    } else {
      html.setAttribute('data-theme', 'light');
      if (btn) btn.textContent = '☀️ Light';
    }
  }

  function stored() { return localStorage.getItem(KEY) || ''; }

  // Initialize
  let pref = stored();
  if (!pref) {
    // default to system preference
    pref = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  apply(pref);

  // Toggle handler
  if (btn) {
    btn.addEventListener('click', () => {
      const next = (stored() || pref) === 'dark' ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      pref = next;
      apply(next);
    });
  }
})();

// Text size controls (A− / A+)
(function initTextZoom() {
  const KEY = 'font-size-pct';
  const html = document.documentElement;
  const dec = document.getElementById('font-dec');
  const inc = document.getElementById('font-inc');
  function apply(pct) {
    html.style.fontSize = pct + '%';
  }
  function clamp(n) { return Math.max(85, Math.min(140, n)); }
  function stored() { const v = parseInt(localStorage.getItem(KEY) || '100', 10); return clamp(isNaN(v) ? 100 : v); }
  let size = stored();
  apply(size);
  dec?.addEventListener('click', () => { size = clamp(size - 10); localStorage.setItem(KEY, String(size)); apply(size); });
  inc?.addEventListener('click', () => { size = clamp(size + 10); localStorage.setItem(KEY, String(size)); apply(size); });
})();

// Contact modal + submit handler
(function initContact() {
  const openBtn = document.getElementById('contact-open');
  const modal = document.getElementById('contact-modal');
  if (!openBtn || !modal) return;
  const form = modal.querySelector('#contact-form');
  const status = modal.querySelector('#cf-status');
  const nameEl = modal.querySelector('#cf-name');
  const msgEl = modal.querySelector('#cf-msg');
  const submitBtn = modal.querySelector('#cf-submit');

  function open() {
    modal.hidden = false;
    status.textContent = '';
    nameEl?.focus();
  }
  function close() { modal.hidden = true; }

  openBtn.addEventListener('click', open);
  document.getElementById('contact-open-hero')?.addEventListener('click', open);
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  window.addEventListener('keydown', (e) => { if (!modal.hidden && e.key === 'Escape') close(); });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (nameEl?.value || '').trim();
    const message = (msgEl?.value || '').trim();
    if (!name || !message) {
      status.textContent = 'Please enter your name and question.';
      return;
    }
    submitBtn.disabled = true;
    status.textContent = 'Sending…';
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message })
      });
      if (r.status === 429) {
        status.textContent = 'Please wait a bit before sending another message.';
        return;
      }
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error('Request failed');
      status.textContent = data.message || 'Thanks! We received your question.';
      form.reset();
      setTimeout(close, 900);
    } catch (_) {
      status.textContent = 'Could not send right now. Please try again later.';
    } finally {
      submitBtn.disabled = false;
    }
  });
})();

// Tabs (device guides)
(function initTabs() {
  document.querySelectorAll('[data-tabs]').forEach(root => {
    const tabs = root.querySelectorAll('[role="tab"]');
    const panels = root.querySelectorAll('[role="tabpanel"]');
    function activate(id) {
      tabs.forEach(t => t.setAttribute('aria-selected', t.getAttribute('data-tab') === id ? 'true' : 'false'));
      panels.forEach(p => p.classList.toggle('hidden', p.getAttribute('data-panel') !== id));
    }
    tabs.forEach(t => t.addEventListener('click', () => activate(t.getAttribute('data-tab'))));
    // initialize first
    const first = tabs[0]?.getAttribute('data-tab');
    if (first) activate(first);
  });
})();

// Collapse long grids on mobile with Show all / Show less
(function initMobileCollapsers() {
  const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 719px)').matches;
  const sections = Array.from(document.querySelectorAll('section[data-collapse]'));
  function apply() {
    sections.forEach(sec => {
      const grid = sec.querySelector('.grid');
      const btn = sec.querySelector('[data-collapse-toggle]');
      if (!grid || !btn) return;
      if (isMobile()) {
        grid.classList.add('collapse-on-mobile');
        btn.hidden = false;
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'Show all';
        btn.onclick = () => {
          const expanded = btn.getAttribute('aria-expanded') === 'true';
          if (expanded) {
            grid.classList.add('collapse-on-mobile');
            btn.setAttribute('aria-expanded', 'false');
            btn.textContent = 'Show all';
          } else {
            grid.classList.remove('collapse-on-mobile');
            btn.setAttribute('aria-expanded', 'true');
            btn.textContent = 'Show less';
          }
        };
      } else {
        grid.classList.remove('collapse-on-mobile');
        btn.hidden = true;
      }
    });
  }
  apply();
  window.addEventListener('resize', () => { apply(); });
})();

// One-at-a-time accordions for main sections
(function initAccordions() {
  const groups = Array.from(document.querySelectorAll('main section.accordion > details'));
  if (!groups.length) return;
  groups.forEach(d => {
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      groups.forEach(other => { if (other !== d && other.open) other.open = false; });
      // Ensure focus remains visible on newly opened summary
      d.querySelector('summary')?.focus?.();
    });
  });
})();

// Guide search filter
(function initGuideSearch() {
  const input = document.getElementById('guide-search');
  const section = document.getElementById('fix');
  if (!input || !section) return;
  const guides = Array.from(section.querySelectorAll('.guide'));
  function applyFilter() {
    const q = input.value.trim().toLowerCase();
    guides.forEach(card => {
      const text = card.innerText.toLowerCase();
      const show = !q || text.includes(q);
      card.style.display = show ? '' : 'none';
    });
  }
  input.addEventListener('input', applyFilter);
})();

// Copy steps / Print handlers
(function initCopyPrint() {
  document.addEventListener('click', async (e) => {
    const printBtn = e.target.closest('[data-print]');
    if (printBtn) {
      const sel = printBtn.getAttribute('data-print');
      const target = sel ? document.querySelector(sel) : printBtn.closest('.guide');
      if (!target) return;
      const w = window.open('', '_blank');
      if (!w) return;
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => `<link rel="stylesheet" href="${l.getAttribute('href')}">`).join('');
      w.document.write(`<!doctype html><html><head><meta charset="utf-8">${styles}<title>Print</title></head><body>${target.outerHTML}</body></html>`);
      w.document.close();
      w.focus();
      w.print();
      return;
    }
    const copyBtn = e.target.closest('[data-copy-steps]');
    if (copyBtn) {
      const card = copyBtn.closest('.guide') || copyBtn.closest('[id]');
      if (!card) return;
      let lines = [];
      // If tabs present, use the visible panel
      const activePanel = card.querySelector('.tab-panel:not(.hidden)');
      const scope = activePanel || card;
      scope.querySelectorAll('ol > li, ul > li').forEach(li => lines.push('- ' + li.textContent.trim()));
      // Include details summaries if present
      scope.querySelectorAll('details').forEach(d => {
        const sum = d.querySelector('summary');
        if (sum) lines.push(sum.textContent.trim() + ':');
        const p = d.textContent.replace(sum?.textContent || '', '').trim();
        if (p) lines.push('  ' + p);
      });
      const text = lines.join('\n');
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => (copyBtn.textContent = 'Copy steps'), 1200);
      } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); copyBtn.textContent = 'Copied!'; } catch {}
        document.body.removeChild(ta);
        setTimeout(() => (copyBtn.textContent = 'Copy steps'), 1200);
      }
    }
  });
})();

// (PWA disabled for now)
// Clean up any legacy service worker to avoid caching issues
(function cleanupLegacySW(){
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => {
          if (r.active && r.active.scriptURL && r.active.scriptURL.includes('/sw.js')) {
            r.unregister();
          }
        });
      });
    } catch (_) {}
  }
})();
