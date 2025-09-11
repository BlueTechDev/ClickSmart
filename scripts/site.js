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
