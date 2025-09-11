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

// Simple helper to convert YouTube URLs to embed URLs
function toYouTubeEmbed(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    // youtu.be/VIDEO
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`;
    }
    // youtube.com/watch?v=VIDEO or /shorts/VIDEO or already /embed/VIDEO
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'shorts' && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
      if (parts[0] === 'embed' && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
    }
    // Otherwise, return as-is; iframe may still handle it
    return url;
  } catch {
    return url;
  }
}

// Wire up Add/Change and Clear buttons for videos
(function initVideoCards() {
  document.querySelectorAll('.video-card').forEach(card => {
    const title = card.dataset.title || 'Training Video';
    const frame = card.querySelector('iframe');
    card.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (action === 'set-video') {
        const input = prompt(`Paste a YouTube link for: ${title}`);
        if (input) frame.src = toYouTubeEmbed(input.trim());
      } else if (action === 'clear-video') {
        frame.src = '';
      }
    });
  });
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
