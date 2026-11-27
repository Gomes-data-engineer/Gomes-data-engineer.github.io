// ---------- Theme toggle (remembers choice when storage is available) ----------
(function () {
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const current = () => root.dataset.theme || 'dark'; // dark is the default
  root.dataset.theme = current();
  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
})();

// ---------- Data-lineage diagrams ----------
// Each spec: layers (left → right), each layer a list of nodes; edges by node id.
// Node types: source · bronze · silver · gold · serve · ai
const LINEAGE = {
  hero: {
    layers: [
      [{ id: 'api', t: 'REST APIs', s: 'source' }, { id: 'db', t: 'OLTP DBs', s: 'source' }, { id: 'files', t: 'Files', s: 'source' }],
      [{ id: 'br', t: 'Bronze', s: 'bronze', sub: 'raw · append' }],
      [{ id: 'sv', t: 'Silver', s: 'silver', sub: 'clean · typed' }],
      [{ id: 'gd', t: 'Gold', s: 'gold', sub: 'dbt test ✓' }],
      [{ id: 'bi', t: 'Power BI', s: 'serve', sub: 'semantic model' }, { id: 'ai', t: 'AI / LLM', s: 'ai', sub: 'trusted metrics' }]
    ],
    edges: [['api', 'br'], ['db', 'br'], ['files', 'br'], ['br', 'sv'], ['sv', 'gd'], ['gd', 'bi'], ['gd', 'ai']]
  },
  evollo: {
    layers: [
      [{ id: 'api', t: 'APIs · CRMs', s: 'source', sub: 'dynamic' }, { id: 'sftp', t: 'SFTP', s: 'source', sub: 'CSV · JSON · XML' }, { id: 'cloud', t: 'S3 · SharePoint', s: 'source', sub: '+ OneDrive' }, { id: 'db', t: 'SQL · NoSQL', s: 'source', sub: 'MySQL·PG·Mongo' }],
      [{ id: 'br', t: 'S3 raw', s: 'bronze', sub: 'YYYYMMDD_*.csv' }],
      [{ id: 'gate', t: 'Quality gate', s: 'silver', sub: 'schema · codec' }],
      [{ id: 'dw', t: 'Warehouse', s: 'gold', sub: 'selection rules' }, { id: 'mail', t: 'Client e-mail', s: 'serve', sub: 'fix & resend' }],
      [{ id: 'media', t: 'Media check', s: 'silver', sub: '00:00 · integrity' }],
      [{ id: 'sp', t: 'Speech AI', s: 'ai', sub: 'transcribe · tag' }],
      [{ id: 'q', t: 'Quality app', s: 'serve', sub: 'metadata + path' }, { id: 'bi', t: 'Power BI', s: 'serve', sub: 'embedded' }, { id: 'ret', t: 'Return files', s: 'serve', sub: 'custom .csv' }]
    ],
    edges: [['api', 'br'], ['sftp', 'br'], ['cloud', 'br'], ['db', 'br'], ['br', 'gate'], ['gate', 'dw'], ['gate', 'mail'], ['dw', 'media'], ['media', 'sp'], ['sp', 'q'], ['sp', 'bi'], ['sp', 'ret']]
  },
  cpp: {
    layers: [
      [{ id: 'notion', t: 'Notion API', s: 'source', sub: 'HR cycles' }, { id: 'gitlab', t: 'GitLab API', s: 'source', sub: 'MRs · pipelines' }, { id: 'slack', t: 'Slack API', s: 'source', sub: 'people' }, { id: 'sp', t: 'SharePoint', s: 'source', sub: 'timesheets · files' }],
      [{ id: 'br', t: 'Bronze', s: 'bronze', sub: 'PostgreSQL' }],
      [{ id: 'sv', t: 'Silver', s: 'silver', sub: 'dbt models' }],
      [{ id: 'gd', t: 'Gold', s: 'gold', sub: '~30 tests ✓' }],
      [{ id: 'idp', t: 'IDP · Health', s: 'serve', sub: 'promotion logic' }, { id: 'qa', t: 'QA Maturity', s: 'serve', sub: 'CI health' }, { id: 'ai', t: 'AI Usage', s: 'ai', sub: 'cost per client' }, { id: 'al', t: 'E-mail alerts', s: 'serve', sub: 'per audience' }]
    ],
    edges: [['notion', 'br'], ['gitlab', 'br'], ['slack', 'br'], ['sp', 'br'], ['br', 'sv'], ['sv', 'gd'], ['gd', 'idp'], ['gd', 'qa'], ['gd', 'ai'], ['gd', 'al']]
  },
  finbot: {
    layers: [
      [{ id: 'txt', t: 'Telegram text', s: 'source' }, { id: 'voice', t: 'Voice note', s: 'source' }],
      [{ id: 'llm', t: 'Gemini', s: 'ai', sub: 'speech → JSON' }],
      [{ id: 'api', t: 'FastAPI', s: 'serve', sub: '+ Celery workers' }],
      [{ id: 'pg', t: 'PostgreSQL', s: 'silver', sub: 'constraints · idx' }],
      [{ id: 'st', t: 'Streamlit', s: 'serve', sub: 'dashboard' }, { id: 'nx', t: 'Next.js', s: 'serve', sub: 'analytics UI' }]
    ],
    edges: [['txt', 'llm'], ['voice', 'llm'], ['llm', 'api'], ['api', 'pg'], ['pg', 'st'], ['pg', 'nx']]
  }
};

function renderLineage(el) {
  const spec = LINEAGE[el.dataset.lineage];
  if (!spec) return;
  const W = Math.max(260, Math.round(el.clientWidth));
  const L = spec.layers.length;
  const maxPerLayer = Math.max(...spec.layers.map((l) => l.length));
  const horizontal = W / L >= 118;
  const pad = 6, nodeH = horizontal ? 40 : 34, pos = {};
  let H, nodeW;

  if (horizontal) {
    nodeW = Math.min(132, (W - pad * 2) / L - 22);
    const rowGap = 12;
    H = maxPerLayer * nodeH + (maxPerLayer - 1) * rowGap + pad * 2;
    const step = (W - pad * 2 - nodeW) / (L - 1);
    spec.layers.forEach((layer, i) => {
      const total = layer.length * nodeH + (layer.length - 1) * rowGap;
      layer.forEach((n, j) => {
        pos[n.id] = { x: pad + i * step, y: (H - total) / 2 + j * (nodeH + rowGap), w: nodeW, n };
      });
    });
  } else {
    const colGap = 8, layerGap = 18;
    H = L * nodeH + (L - 1) * layerGap + pad * 2;
    spec.layers.forEach((layer, i) => {
      const w = Math.min(150, (W - pad * 2 - (layer.length - 1) * colGap) / layer.length);
      const total = layer.length * w + (layer.length - 1) * colGap;
      layer.forEach((n, j) => {
        pos[n.id] = { x: (W - total) / 2 + j * (w + colGap), y: pad + i * (nodeH + layerGap), w, n };
      });
    });
  }

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let edges = '', flows = '', nodes = '';
  spec.edges.forEach(([a, b], k) => {
    const p = pos[a], q = pos[b];
    let d;
    if (horizontal) {
      const x1 = p.x + p.w, y1 = p.y + nodeH / 2, x2 = q.x, y2 = q.y + nodeH / 2, mx = (x1 + x2) / 2;
      d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
    } else {
      const x1 = p.x + p.w / 2, y1 = p.y + nodeH, x2 = q.x + q.w / 2, y2 = q.y, my = (y1 + y2) / 2;
      d = `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
    }
    const ai = p.n.s === 'ai' || q.n.s === 'ai' ? ' ai' : '';
    edges += `<path class="ln-edge" d="${d}"/>`;
    flows += `<path class="ln-flow${ai}" d="${d}" style="animation-delay:${(-k * 0.37).toFixed(2)}s"/>`;
  });
  Object.values(pos).forEach(({ x, y, w, n }) => {
    const cx = x + w / 2 + 2;
    const maxChars = Math.floor((w - 12) / 6.4);
    const label = n.t.length > maxChars ? n.t.slice(0, maxChars - 1) + '…' : n.t;
    const sub = n.sub && w >= 80 ? (n.sub.length > Math.floor((w - 10) / 5.8) ? '' : n.sub) : '';
    nodes += `<g class="ln-node ${n.s}"><title>${esc(n.t + (n.sub ? ' — ' + n.sub : ''))}</title>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${nodeH}" rx="8"/>` +
      `<rect class="bar" x="${x}" y="${y + 8}" width="3" height="${nodeH - 16}" rx="1.5"/>` +
      (sub
        ? `<text x="${cx}" y="${y + nodeH / 2 - 3}" text-anchor="middle">${esc(label)}</text><text class="sub" x="${cx}" y="${y + nodeH / 2 + 10}" text-anchor="middle">${esc(sub)}</text>`
        : `<text x="${cx}" y="${y + nodeH / 2 + 4}" text-anchor="middle">${esc(label)}</text>`) +
      `</g>`;
  });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Data lineage diagram">${edges}${flows}${nodes}</svg>`;
}

(function () {
  const els = document.querySelectorAll('.lineage');
  const ro = new ResizeObserver((entries) => {
    entries.forEach((e) => {
      const w = Math.round(e.contentRect.width);
      if (e.target._w !== w) { e.target._w = w; renderLineage(e.target); }
    });
  });
  // Draw once right away (ResizeObserver may not fire in background tabs), then keep in sync with resizes
  els.forEach((el) => { el._w = Math.round(el.clientWidth); renderLineage(el); ro.observe(el); });
})();

// ---------- Technology icons on chips (first match wins; order matters) ----------
const ICON_BASE = new URL('assets/icons/', document.currentScript ? document.currentScript.src : location.href).href;
(function () {
  const MAP = [
    [/sql server/, 'sqlserver'], [/postgres/, 'postgresql'], [/mysql/, 'mysql'], [/mongo/, 'mongodb'],
    [/pandas/, 'pandas'], [/python/, 'python'], [/docker/, 'docker'], [/gitlab/, 'gitlab'], [/github/, 'github'],
    [/^git$/, 'git'], [/jira/, 'jira'], [/figma/, 'figma'], [/terraform/, 'terraform'], [/claude/, 'claude'],
    [/gemini/, 'googlegemini'], [/notion/, 'notion'], [/fastapi/, 'fastapi'], [/next\.js/, 'nextdotjs'],
    [/supabase/, 'supabase'], [/streamlit/, 'streamlit'], [/celery/, 'celery'], [/telegram/, 'telegram'],
    [/airflow/, 'apacheairflow'], [/databricks/, 'databricks'], [/pyspark|spark/, 'apachespark'],
    [/power automate/, 'flow'], [/power query/, 'layers'], [/power bi|dax|semantic|semânt|pbip/, 'bars'],
    [/excel/, 'sheet'], [/aws|s3|lambda|cloudwatch|fabric/, 'cloud'], [/sharepoint|onedrive|sftp/, 'folder'],
    [/rest api|apis rest|slack api/, 'api'], [/azure sql|^sql$/, 'db'], [/dbt|medallion|star schema|esquema estrela|design system/, 'layers'],
    [/llm|auto-doc|documentação autom|ai usage|uso de ia/, 'spark'], [/test|qa|review|revis|gdpr|lgpd/, 'check'], [/e-mail/, 'mail'],
    [/scrum|workshop|lead|líder|lider/, 'people'], [/english|inglês/, 'lang'], [/pentaho/, 'flow']
  ];
  document.querySelectorAll('.chips li').forEach((li) => {
    const txt = li.textContent.trim().toLowerCase();
    const hit = MAP.find(([re]) => re.test(txt));
    if (!hit) return;
    const i = document.createElement('i');
    i.className = 'ic';
    i.setAttribute('aria-hidden', 'true');
    i.style.setProperty('--ic', `url("${ICON_BASE}${hit[1]}.svg")`);
    li.prepend(i);
    li.classList.add('has-ic');
  });
})();

// ---------- Scroll reveal ----------
(function () {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { items.forEach((i) => i.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach((i, k) => { i.style.transitionDelay = (k < 6 ? k * 70 : 0) + 'ms'; io.observe(i); });
})();

// ---------- Count-up stats ----------
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = document.querySelectorAll('[data-count]');
  if (reduce || !('IntersectionObserver' in window)) return;
  const fmt = (el, v) => {
    const n = Math.round(v);
    el.textContent = (el.dataset.prefix || '') + (n < 0 ? '−' + Math.abs(n) : n) + (el.dataset.suffix || '');
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, target = +el.dataset.count, t0 = performance.now(), dur = 1100;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
        fmt(el, target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
})();

// ---------- Spotlight hover ----------
document.querySelectorAll('.spot').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', e.clientX - r.left + 'px');
    el.style.setProperty('--my', e.clientY - r.top + 'px');
  });
});

// ---------- Active nav link ----------
(function () {
  const links = [...document.querySelectorAll('.nav-links a')];
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { links.forEach((a) => a.classList.remove('active')); map.get(e.target.id)?.classList.add('active'); }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
})();

// ---------- Power BI report viewer (new tab on small screens) ----------
(function () {
  const dlg = document.getElementById('reportDialog');
  const frame = document.getElementById('reportFrame');
  const title = document.getElementById('reportTitle');
  const newTab = document.getElementById('reportNewTab');
  document.querySelectorAll('.shot').forEach((el) => {
    el.addEventListener('click', () => {
      const url = el.dataset.report;
      if (window.innerWidth < 760 || typeof dlg.showModal !== 'function') {
        window.open(url, '_blank', 'noopener');
        return;
      }
      title.textContent = el.dataset.title;
      newTab.href = url;
      frame.src = url;
      dlg.showModal();
    });
  });
  document.getElementById('reportClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { frame.src = 'about:blank'; });
})();
