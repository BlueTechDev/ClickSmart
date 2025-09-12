// TL;DR page logic: hamburger menu, theme, caching, quick summaries, and top 5 news fetch

// Gen date footer
(function() {
  const el = document.getElementById('gen-date');
  if (el) el.textContent = new Date().toLocaleString([], { year:'numeric', month:'short', day:'2-digit' });
})();

// Hamburger menu toggle for mobile
(function() {
  const btn = document.getElementById('menu-btn');
  const menu = document.getElementById('site-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();

// Theme init + toggle (shared key with main site)
(function() {
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
  let pref = stored();
  if (!pref) {
    pref = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  apply(pref);
  btn?.addEventListener('click', () => {
    const next = (stored() || pref) === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    pref = next;
    apply(next);
  });
})();

// Feeds: using known RSS endpoints where available
const FEEDS = [
  { name: 'IT Brew', home: 'https://www.itbrew.com/', rss: '' },
  { name: 'The Download (MIT Tech Review)', home: 'https://www.technologyreview.com/the-download/', rss: 'https://www.technologyreview.com/feed/' },
  { name: 'Wired', home: 'https://www.wired.com/', rss: 'https://www.wired.com/feed/rss' },
  { name: 'TechCrunch', home: 'https://techcrunch.com/', rss: 'https://techcrunch.com/feed/' }
];

// Strict tech topics to include (match if any is present)
const STRICT_TECH_KEYWORDS = [
  // Security / breaches
  'breach','data breach','data leak','leak','compromis','hack','hacked','ransomware','malware','phishing','vulnerability','vulnerabilities','cve','zero-day','zero day','exploit','exploited','patch','patch tuesday','security','bug fix','mitigation',
  // AI / ML
  'ai','artificial intelligence','machine learning','ml ','llm','gpt','chatgpt','gemini','claude','openai','anthropic','deepmind','lora','agents','rnn','transformer',
  // Consumer/computing
  'windows','macos','ios','android','linux','ubuntu','debian','red hat','chrome','safari','edge','firefox','browser','update','feature','bug','fix',
  // Devices / connectivity
  'iphone','ipad','macbook','pixel','galaxy','router','wifi','wi-fi','bluetooth','usb','ssd','gpu','cpu','nvidia','amd','intel',
  // Cloud/dev/tools
  'cloud','saas','aws','azure','gcp','kubernetes','docker','devops','github','gitlab','vscode','visual studio',
  // Productivity / tips
  'tip','tips','trick','tricks','how to','how‑to','guide','best practices','shortcut','protect','secure your','mfa','2fa','password','password manager',
  // Scams / safety
  'scam','fraud','warning','watch out','alert','privacy','encryption'
];

// Non-tech topics to exclude (if present, we filter out)
const EXCLUDE_KEYWORDS = [
  // Politics & government
  'election','senate','congress','parliament','white house','prime minister','president','campaign','democrat','republican','labour','tory','minister','governor','mayor','ballot','vote','voted','voting','policy','politic','political',
  // Sports
  'nfl','nba','mlb','nhl','soccer','football','baseball','basketball','tennis','golf','olympic',
  // Entertainment/celebs
  'celebrity','celeb','music','movie','film','box office','award','oscars','grammys','emmys',
  // General finance (still allow if paired with strict tech terms)
  'stock','market','earnings','ipo'
];

async function fetchWithFallback(url) {
  // Direct fetch only (no public CORS proxies)
  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to fetch: ' + url);
  return await r.text();
}

function parseRSS(text, sourceName) {
  const items = [];
  try {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    // RSS 2.0
    doc.querySelectorAll('item').forEach(item => {
      const title = item.querySelector('title')?.textContent?.trim();
      const link = item.querySelector('link')?.textContent?.trim();
      const pubDate = item.querySelector('pubDate')?.textContent || item.querySelector('updated')?.textContent || '';
      const desc = item.querySelector('description')?.textContent || item.querySelector('content\\:encoded')?.textContent || '';
      const cats = Array.from(item.querySelectorAll('category')).map(c => c.textContent || '').join(' ');
      if (title && link) {
        items.push({ title, link, date: new Date(pubDate), source: sourceName, description: sanitize(desc), categories: cats });
      }
    });
    // Atom
    if (!items.length) {
      doc.querySelectorAll('entry').forEach(entry => {
        const title = entry.querySelector('title')?.textContent?.trim();
        const link = entry.querySelector('link')?.getAttribute('href');
        const pubDate = entry.querySelector('updated')?.textContent || entry.querySelector('published')?.textContent || '';
        const desc = entry.querySelector('summary')?.textContent || entry.querySelector('content')?.textContent || '';
        const cats = Array.from(entry.querySelectorAll('category')).map(c => c.getAttribute('term') || c.textContent || '').join(' ');
        if (title && link) {
          items.push({ title, link, date: new Date(pubDate), source: sourceName, description: sanitize(desc), categories: cats });
        }
      });
    }
  } catch (e) {
    // ignore parse errors
  }
  return items;
}

function sanitize(html) {
  try {
    // Parse as HTML and extract textContent to drop tags and scripts
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
  } catch {
    // Fallback: strip tags crudely
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

function summarize(text, max = 260) {
  if (!text) return '';
  const clean = text.replace(/&nbsp;/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/[,;:\s]+\S*$/, '') + '…';
}

const CACHE_KEY = 'tldr-cache-v2';
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes

async function loadTopFive() {
  const list = document.getElementById('tldr-list');
  const fallback = document.getElementById('fallback');
  const lastRun = document.getElementById('last-run');
  if (!list) return;
  list.innerHTML = '';
  list.setAttribute('aria-busy', 'true');
  fallback?.classList.add('hidden');

  // Try cache first
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS && Array.isArray(cached.items)) {
      renderTopFive(cached.items, list, lastRun);
    }
  } catch {}

  const all = [];
  for (const f of FEEDS) {
    if (!f.rss) continue; // skip if no RSS known
    try {
      const text = await fetchWithFallback(f.rss);
      const items = parseRSS(text, f.name).slice(0, 5);
      all.push(...items);
    } catch (e) {
      // continue to next feed
    }
  }

  // Sort by date desc and take top 5
  const top = all
    .filter(i => i && i.title && i.link && isTechItem(i))
    .sort((a, b) => (b.date?.getTime?.() || 0) - (a.date?.getTime?.() || 0))
    .slice(0, 5);

  if (!top.length) {
    fallback?.classList.remove('hidden');
    list.removeAttribute('aria-busy');
    if (lastRun) lastRun.textContent = 'Last attempted: ' + new Date().toLocaleTimeString();
    return;
  }

  renderTopFive(top, list, lastRun);

  // Save to cache
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items: top })); } catch {}
}

document.getElementById('refresh')?.addEventListener('click', loadTopFive);
// Initial load
loadTopFive();

function renderTopFive(items, list, lastRun) {
  const fmt = new Intl.DateTimeFormat([], { month: 'short', day: '2-digit' });
  list.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'card';
    const blurb = summarize(item.description || '');
    const full = sanitize(item.description || '');
    li.innerHTML = `
      <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>
      ${blurb ? `<p class="blurb short">${blurb}</p>` : ''}
      ${full && full !== blurb ? `<p class="blurb full">${full}</p>` : ''}
      ${full && full !== blurb ? `<button class="btn sm" data-action="toggle-summary">Show more</button>` : ''}
      <div class="meta">
        <span class="source">${item.source}</span>
        <span> • ${isNaN(item.date) ? '' : fmt.format(item.date)}</span>
        <span> • <a href="${item.link}" target="_blank" rel="noopener noreferrer">Read full article ↗</a></span>
      </div>
      <div class="card-actions">
        <button class="btn sm" data-action="copy" data-url="${item.link}">Copy Link</button>
        <button class="btn sm" data-action="open" data-url="${item.link}">Open</button>
        <button class="btn sm" data-action="share" data-url="${item.link}" data-title="${item.title.replace(/&/g,'&amp;')}">Share</button>
      </div>
    `;
    list.appendChild(li);
  });
  list.removeAttribute('aria-busy');
  if (lastRun) lastRun.textContent = 'Updated: ' + new Date().toLocaleTimeString();
}

// Share/copy/open handlers via event delegation
document.getElementById('tldr-list')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  const url = btn.getAttribute('data-url');
  const title = btn.getAttribute('data-title') || 'Article';
  if (!url) return;
  if (action === 'toggle-summary') {
    const card = btn.closest('.card');
    const shortP = card.querySelector('.blurb.short');
    const fullP = card.querySelector('.blurb.full');
    const open = fullP?.classList.toggle('open');
    shortP?.classList.toggle('open', !!open);
    btn.textContent = open ? 'Show less' : 'Show more';
    return;
  }
  if (action === 'copy') {
    try {
      await navigator.clipboard.writeText(url);
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = 'Copy Link'), 1200);
    } catch {
      // Fallback: create a temp input
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); btn.textContent = 'Copied!'; } catch {}
      document.body.removeChild(ta);
      setTimeout(() => (btn.textContent = 'Copy Link'), 1200);
    }
  } else if (action === 'open') {
    window.open(url, '_blank', 'noopener');
  } else if (action === 'share') {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    } else {
      // Fallback to copy if share not available
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  }
});

function isTechItem(item) {
  const hay = `${item.title || ''} ${item.description || ''} ${item.categories || ''}`.toLowerCase();
  const hasTech = STRICT_TECH_KEYWORDS.some(k => hay.includes(k));
  if (!hasTech) return false;
  const hasExcluded = EXCLUDE_KEYWORDS.some(k => hay.includes(k));
  // Allow if it contains strict tech AND no excluded topic
  return !hasExcluded;
}

// Contact modal + submit
(function initContact() {
  const openBtn = document.getElementById('contact-open');
  const modal = document.getElementById('contact-modal');
  if (!openBtn || !modal) return;
  const form = modal.querySelector('#contact-form');
  const status = modal.querySelector('#cf-status');
  const nameEl = modal.querySelector('#cf-name');
  const msgEl = modal.querySelector('#cf-msg');
  const submitBtn = modal.querySelector('#cf-submit');

  function open() { modal.hidden = false; status.textContent = ''; nameEl?.focus(); }
  function close() { modal.hidden = true; }

  openBtn.addEventListener('click', open);
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  window.addEventListener('keydown', (e) => { if (!modal.hidden && e.key === 'Escape') close(); });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (nameEl?.value || '').trim();
    const message = (msgEl?.value || '').trim();
    if (!name || !message) { status.textContent = 'Please enter your name and question.'; return; }
    submitBtn.disabled = true;
    status.textContent = 'Sending…';
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, message }) });
      if (r.status === 429) { status.textContent = 'Please wait a bit before sending another message.'; return; }
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

// Mobile collapse for TL;DR list
(function initTldrCollapse() {
  const list = document.getElementById('tldr-list');
  const btn = document.getElementById('tldr-toggle');
  if (!list || !btn) return;
  const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 719px)').matches;
  function apply() {
    if (isMobile()) {
      list.classList.add('collapse-on-mobile');
      btn.hidden = false;
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = 'Show all';
      btn.onclick = () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        if (expanded) {
          list.classList.add('collapse-on-mobile');
          btn.setAttribute('aria-expanded', 'false');
          btn.textContent = 'Show all';
        } else {
          list.classList.remove('collapse-on-mobile');
          btn.setAttribute('aria-expanded', 'true');
          btn.textContent = 'Show less';
        }
      };
    } else {
      list.classList.remove('collapse-on-mobile');
      btn.hidden = true;
    }
  }
  apply();
  window.addEventListener('resize', apply);
})();
