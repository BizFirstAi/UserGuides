#!/usr/bin/env node
// Local port of .github/workflows/deploy.yml's build steps.
// Run before pushing so GitHub Pages (branch-deploy) serves fully-built output
// without depending on the Actions workflow triggering.
//
// Usage: node scripts/build-docs.mjs [--skip-pagefind] [--skip-blog]

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const WEB = path.join(DOCS, 'WebSites');
const BASE_URL = 'https://docs.bizfirstai.com';
const REPO = 'BizFirstAi/UserGuides';

const args = new Set(process.argv.slice(2));
const SKIP_PAGEFIND = args.has('--skip-pagefind');
const SKIP_BLOG = args.has('--skip-blog');

function walkHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Step: What's New page ──────────────────────────────────────────
function generateWhatsNew() {
  const outDir = path.join(DOCS, 'whats-new');
  fs.mkdirSync(outDir, { recursive: true });

  const log = execFileSync(
    'git',
    ['log', '--diff-filter=A', '--name-only', '--pretty=format:COMMIT|%ad|%s', '--date=format:%Y-%m-%d', '--', 'docs/WebSites'],
    { cwd: ROOT, encoding: 'utf8' }
  );

  const SKIP = new Set(['shared.css', 'shared.js', 'blog-search.json']);
  const entries = [];
  let current = null;

  for (const raw of log.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('COMMIT|')) {
      const parts = line.split('|');
      current = { date: parts[1], msg: parts.slice(2).join('|') };
    } else if (line.endsWith('.html') && current) {
      const p = line;
      const name = path.basename(p);
      if (SKIP.has(name)) continue;
      const abs = path.join(ROOT, p);
      if (!fs.existsSync(abs)) continue;

      let title = name.replace(/\.html$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      try {
        const content = fs.readFileSync(abs, 'utf8');
        const m = content.match(/<title>([^<]+)<\/title>/);
        if (m) title = m[1].trim().replace(/\s*[|—–-]\s*BizFirstAI.*$/, '').trim();
      } catch {}

      const rel = path.relative(DOCS, abs).split(path.sep).join('/');
      let url;
      if (name === 'index.html') {
        const parentRel = path.relative(DOCS, path.dirname(abs)).split(path.sep).join('/');
        url = BASE_URL + '/' + parentRel + '/';
      } else {
        url = BASE_URL + '/' + rel;
      }

      const relWebParts = path.relative(WEB, abs).split(path.sep);
      const section = relWebParts[0] && !relWebParts[0].startsWith('..') ? relWebParts[0] : '';

      entries.push({ date: current.date, title, url, section });
    }
  }

  const byMonth = new Map();
  for (const e of entries) {
    const ym = e.date.slice(0, 7);
    if (!byMonth.has(ym)) byMonth.set(ym, []);
    byMonth.get(ym).push(e);
  }
  const sortedMonths = [...byMonth.keys()].sort().reverse();

  const MONTH_NAMES = { '01': 'January', '02': 'February', '03': 'March', '04': 'April', '05': 'May', '06': 'June', '07': 'July', '08': 'August', '09': 'September', '10': 'October', '11': 'November', '12': 'December' };
  const monthLabel = ym => { const [y, m] = ym.split('-'); return `${MONTH_NAMES[m] || m} ${y}`; };

  const rows = [];
  for (const ym of sortedMonths) {
    rows.push(`<div class="month-group"><h2>${esc(monthLabel(ym))}</h2><ul class="entry-list">`);
    for (const e of byMonth.get(ym)) {
      const badge = e.section ? `<span class="section-badge">${esc(e.section)}</span>` : '';
      rows.push(`<li><span class="entry-date">${esc(e.date)}</span>${badge}<a href="${esc(e.url)}" target="_top">${esc(e.title)}</a></li>`);
    }
    rows.push('</ul></div>');
  }

  const total = entries.length;
  const contentHtml = rows.length ? rows.join('\n') : '<p style="color:var(--text-muted)">No new guides found in git history.</p>';

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>What's New — BizFirstAI Docs</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
:root{--bg:#0f1117;--surface:#1e2736;--border:#3d4a5a;--accent:#6c8cff;--text:#e2e8f0;--text-muted:#8892b0;--text-dim:#4a5568;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.65;padding-top:40px;}
.topbar{position:fixed;top:0;left:0;right:0;z-index:200;background:#1e2736;border-bottom:1px solid #2d3a4a;height:40px;display:flex;align-items:center;padding:0 20px;}
.topbar img{height:26px;}
.topbar-right{margin-left:auto;display:flex;gap:6px;}
.topbar-right a{font-size:12px;color:#b0c4d8;text-decoration:none;padding:4px 12px;border-radius:5px;display:flex;align-items:center;gap:6px;}
.topbar-right a:hover{background:rgba(255,255,255,0.08);color:#fff;}
.page{max-width:860px;margin:0 auto;padding:52px 40px;}
.page-header{margin-bottom:40px;}
.tag{display:inline-block;font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:rgba(108,140,255,.15);color:var(--accent);margin-bottom:12px;}
h1{font-size:2rem;font-weight:700;margin-bottom:12px;}
.lead{font-size:1.05rem;color:var(--text-muted);}
h2{font-size:1.1rem;font-weight:700;color:var(--text);margin:36px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border);}
.month-group{margin-bottom:8px;}
.entry-list{list-style:none;padding:0;}
.entry-list li{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(61,74,90,0.4);font-size:0.9rem;flex-wrap:wrap;}
.entry-list li:last-child{border-bottom:none;}
.entry-date{font-size:0.72rem;color:var(--text-dim);min-width:88px;font-family:monospace;}
.entry-list a{color:var(--text);text-decoration:none;flex:1;}
.entry-list a:hover{color:var(--accent);}
.section-badge{font-size:0.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:4px;background:rgba(108,140,255,.12);color:var(--accent);white-space:nowrap;}
.summary{display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--text-muted);margin-top:10px;}
</style>
</head>
<body>
<div class="topbar">
  <a href="https://bizfirstai.com" target="_blank"><img src="../images/icons/BizFirstAiFull.png" alt="BizFirstAI"></a>
  <div class="topbar-right">
    <a href="https://docs.bizfirstai.com/" target="_top"><i class="fa-solid fa-house"></i> Portal</a>
    <a href="https://community.bizfirstai.com" target="_blank"><i class="fa-solid fa-people-group"></i> Community</a>
  </div>
</div>
<div class="page">
  <div class="page-header">
    <span class="tag">Documentation</span>
    <h1>What's New</h1>
    <p class="lead">Every guide added to the portal — automatically tracked from git history.</p>
    <div class="summary"><i class="fa-solid fa-file-lines"></i> ${total} guides total</div>
  </div>
  ${contentHtml}
</div>
</body></html>`;

  fs.writeFileSync(path.join(outDir, 'index.html'), page, 'utf8');
  console.log(`What's New page generated: ${total} entries across ${sortedMonths.length} months`);
}

// ── Step: Coverage dashboard ───────────────────────────────────────
function generateCoverage() {
  const outDir = path.join(DOCS, 'coverage');
  fs.mkdirSync(outDir, { recursive: true });

  const SKIP = new Set(['pagefind', 'AtlasForms', '.git', 'whats-new', 'coverage']);
  const ICONS = {
    FlowStudio: 'fa-diagram-project', EdgeStream: 'fa-wave-square', EdgeInteract: 'fa-comments',
    DataOcean: 'fa-database', AppStudio: 'fa-laptop-code', InstallHub: 'fa-box', MarketHub: 'fa-store',
    Octopus: 'fa-spider', GuardRails: 'fa-shield-halved', WorkDesk: 'fa-briefcase', InfraHub: 'fa-server',
    Passport: 'fa-id-card', AtlasForms: 'fa-wpforms', ANCP: 'fa-network-wired', BizFirstObserve: 'fa-eye',
    MultiQuery: 'fa-magnifying-glass', ErrorManagement: 'fa-triangle-exclamation', NodeLifeCycle: 'fa-rotate',
    NodePolicies: 'fa-shield', NodeExpressionEngine: 'fa-code', BizExpressions: 'fa-brackets-curly',
  };

  const products = [];
  for (const d of fs.readdirSync(WEB, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!d.isDirectory() || SKIP.has(d.name)) continue;
    const full = path.join(WEB, d.name);
    const pages = walkHtmlFiles(full).filter(f => !['shared.css', 'shared.js'].includes(path.basename(f)));
    const guideDirs = fs.readdirSync(full, { withFileTypes: true }).filter(e => e.isDirectory());
    const icon = ICONS[d.name] || 'fa-book';
    const url = `${BASE_URL}/WebSites/${d.name}/`;
    const color = pages.length >= 10 ? '#34d399' : pages.length >= 3 ? '#fbbf24' : '#f87171';
    products.push({ name: d.name, pages: pages.length, guides: guideDirs.length, icon, url, color });
  }

  const totalPages = products.reduce((s, p) => s + p.pages, 0);
  const totalProds = products.length;
  const wellCovered = products.filter(p => p.pages >= 10).length;

  const cards = products.map(p => `
<a href="${esc(p.url)}" class="cov-card" target="_top">
  <div class="cov-icon" style="background:rgba(108,140,255,0.1)">
    <i class="fa-solid ${p.icon}" style="font-size:22px;color:var(--accent)"></i>
  </div>
  <div class="cov-name">${esc(p.name)}</div>
  <div class="cov-count" style="color:${p.color}">${p.pages} pages</div>
  <div class="cov-bar-bg"><div class="cov-bar" style="width:${Math.min(100, p.pages * 3)}%;background:${p.color}"></div></div>
</a>`).join('\n');

  const legend = `
<div class="legend">
  <span><span class="dot" style="background:#34d399"></span> Well documented (10+)</span>
  <span><span class="dot" style="background:#fbbf24"></span> Sparse (3–9)</span>
  <span><span class="dot" style="background:#f87171"></span> Needs work (&lt;3)</span>
</div>`;

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Docs Coverage — BizFirstAI</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
:root{--bg:#0f1117;--surface:#1e2736;--border:#3d4a5a;--accent:#6c8cff;--text:#e2e8f0;--text-muted:#8892b0;--text-dim:#4a5568;--radius:10px;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);padding-top:40px;}
.topbar{position:fixed;top:0;left:0;right:0;z-index:200;background:#1e2736;border-bottom:1px solid #2d3a4a;height:40px;display:flex;align-items:center;padding:0 20px;}
.topbar img{height:26px;}
.topbar-right{margin-left:auto;display:flex;gap:6px;}
.topbar-right a{font-size:12px;color:#b0c4d8;text-decoration:none;padding:4px 12px;border-radius:5px;display:flex;align-items:center;gap:6px;}
.topbar-right a:hover{background:rgba(255,255,255,0.08);color:#fff;}
.page{max-width:960px;margin:0 auto;padding:52px 40px;}
.page-header{margin-bottom:40px;}
.tag{display:inline-block;font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:rgba(108,140,255,.15);color:var(--accent);margin-bottom:12px;}
h1{font-size:2rem;font-weight:700;margin-bottom:12px;}
.lead{font-size:1.05rem;color:var(--text-muted);}
.stats{display:flex;gap:24px;margin-top:20px;flex-wrap:wrap;}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px 24px;min-width:120px;}
.stat-value{font-size:1.8rem;font-weight:700;color:var(--accent);}
.stat-label{font-size:0.75rem;color:var(--text-muted);margin-top:2px;text-transform:uppercase;letter-spacing:.07em;}
.cov-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:32px;}
.cov-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;text-decoration:none;display:block;transition:all 0.18s;}
.cov-card:hover{border-color:rgba(108,140,255,0.4);transform:translateY(-2px);}
.cov-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;}
.cov-name{font-size:0.9rem;font-weight:600;color:var(--text);margin-bottom:4px;}
.cov-count{font-size:0.8rem;font-weight:600;margin-bottom:8px;}
.cov-bar-bg{height:4px;background:var(--border);border-radius:2px;overflow:hidden;}
.cov-bar{height:100%;border-radius:2px;transition:width 0.3s;}
.legend{display:flex;gap:20px;margin-top:28px;flex-wrap:wrap;font-size:0.8rem;color:var(--text-muted);align-items:center;}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;}
</style>
</head>
<body>
<div class="topbar">
  <a href="https://bizfirstai.com" target="_blank"><img src="../images/icons/BizFirstAiFull.png" alt="BizFirstAI"></a>
  <div class="topbar-right">
    <a href="https://docs.bizfirstai.com/" target="_top"><i class="fa-solid fa-house"></i> Portal</a>
    <a href="https://docs.bizfirstai.com/whats-new/" target="_top"><i class="fa-solid fa-sparkles"></i> What's New</a>
  </div>
</div>
<div class="page">
  <div class="page-header">
    <span class="tag">Documentation</span>
    <h1>Coverage Dashboard</h1>
    <p class="lead">Documentation health across all BizFirstAI product areas.</p>
    <div class="stats">
      <div class="stat"><div class="stat-value">${totalProds}</div><div class="stat-label">Products</div></div>
      <div class="stat"><div class="stat-value">${totalPages}</div><div class="stat-label">Total pages</div></div>
      <div class="stat"><div class="stat-value">${wellCovered}</div><div class="stat-label">Well covered</div></div>
    </div>
    ${legend}
  </div>
  <div class="cov-grid">
    ${cards}
  </div>
</div>
</body></html>`;

  fs.writeFileSync(path.join(outDir, 'index.html'), page, 'utf8');
  console.log(`Coverage dashboard: ${totalProds} products, ${totalPages} pages`);
}

// ── Step: inject docs-repo meta tag ────────────────────────────────
function injectDocsRepoMeta() {
  let count = 0;
  for (const f of walkHtmlFiles(DOCS)) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('name="docs-repo"')) continue;
    const next = content.replace('<meta charset="UTF-8">', `<meta charset="UTF-8"><meta name="docs-repo" content="${REPO}">`);
    if (next !== content) {
      fs.writeFileSync(f, next, 'utf8');
      count++;
    }
  }
  console.log(`docs-repo meta injected into ${count} pages (repo: ${REPO})`);
}

// ── Step: inject OpenGraph tags ────────────────────────────────────
function injectOpenGraphTags() {
  const DEFAULT_IMAGE = `${BASE_URL}/images/icons/BizFirstAiFull.png`;
  let count = 0;
  for (const f of walkHtmlFiles(DOCS).sort()) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('og:title')) continue;

    const titleM = content.match(/<title>([^<]+)<\/title>/);
    const title = titleM ? titleM[1].trim() : 'BizFirstAI Documentation';

    let descM = content.match(/class=["']lead["'][^>]*>([^<]{10,})/);
    if (!descM) descM = content.match(/<p[^>]*>([^<]{30,})/);
    let desc = descM ? descM[1].trim().slice(0, 200) : 'BizFirstAI Developer Documentation';
    desc = desc.replace(/\s+/g, ' ');

    const rel = path.relative(DOCS, f).split(path.sep).join('/');
    let canon;
    if (rel === 'index.html') {
      canon = BASE_URL + '/';
    } else if (path.basename(f) === 'index.html') {
      canon = BASE_URL + '/' + path.relative(DOCS, path.dirname(f)).split(path.sep).join('/') + '/';
    } else {
      canon = BASE_URL + '/' + rel;
    }

    const og = `
<meta property="og:type" content="website">
<meta property="og:site_name" content="BizFirstAI Docs">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canon)}">
<meta property="og:image" content="${DEFAULT_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">`;

    const next = content.replace(/(<meta[^>]+viewport[^>]+>)/, `$1${og}`);
    if (next !== content) {
      fs.writeFileSync(f, next, 'utf8');
      count++;
    }
  }
  console.log(`OpenGraph tags injected into ${count} pages`);
}

// ── Step: distribute shared.js + inject <script> tag ───────────────
function distributeSharedJs() {
  const master = path.join(WEB, 'shared.js');
  if (!fs.existsSync(master)) {
    console.log('shared.js master not found, skipping distribution');
    return;
  }
  const cssFiles = [];
  (function find(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) find(full);
      else if (entry.name === 'shared.css') cssFiles.push(full);
    }
  })(WEB);

  for (const css of cssFiles) {
    fs.copyFileSync(master, path.join(path.dirname(css), 'shared.js'));
  }

  let injected = 0;
  for (const f of walkHtmlFiles(WEB)) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('shared.js')) continue;
    const m = content.match(/href=["']([^"']*shared\.css)["']/);
    if (!m) continue;
    const jsSrc = m[1].replace('shared.css', 'shared.js');
    const next = content.replace('</body>', `<script src="${jsSrc}"></script>\n</body>`);
    fs.writeFileSync(f, next, 'utf8');
    injected++;
  }
  console.log(`shared.js distributed to ${cssFiles.length} dirs, injected into ${injected} pages`);
}

// ── Step: mark sidebar nav elements (idempotent) ────────────────────
function markSidebarNav() {
  let count = 0;
  for (const f of walkHtmlFiles(DOCS)) {
    const content = fs.readFileSync(f, 'utf8');
    const next = content.replace(/<nav (?!data-pagefind-ignore)/g, '<nav data-pagefind-ignore ');
    if (next !== content) {
      fs.writeFileSync(f, next, 'utf8');
      count++;
    }
  }
  console.log(`Sidebar nav marked in ${count} pages`);
}

// ── Step: fetch and index blog posts ────────────────────────────────
async function fetchAndIndexBlog() {
  if (SKIP_BLOG) {
    console.log('Blog fetch skipped (--skip-blog)');
    return;
  }
  try {
    const res = await fetch('https://blog.bizfirstai.com/feed', {
      headers: { 'User-Agent': 'Mozilla/5.0 (BizFirstAI docs build)' },
      signal: AbortSignal.timeout(15000),
    });
    const xml = await res.text();
    const items = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml))) {
      const block = m[1];
      const tag = (name) => {
        const mm = block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`));
        return mm ? mm[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim() : '';
      };
      let url = tag('link') || tag('guid');
      url = url.replace(/https?:\/\/localhost:\d+/, 'https://blog.bizfirstai.com');
      const desc = tag('description').replace(/<[^>]+>/g, '').trim().slice(0, 300);
      items.push({ title: tag('title'), url, description: desc, date: tag('pubDate') });
    }
    fs.writeFileSync(path.join(DOCS, 'blog-search.json'), JSON.stringify(items), 'utf8');
    console.log(`Indexed ${items.length} blog posts`);
  } catch (e) {
    console.log(`Blog fetch skipped: ${e.message}`);
    fs.writeFileSync(path.join(DOCS, 'blog-search.json'), JSON.stringify([]), 'utf8');
  }
}

// ── Step: generate RSS feed ─────────────────────────────────────────
function generateRssFeed() {
  const MAX_ITEMS = 50;
  const nowRfc = new Date().toUTCString().replace(/GMT$/, '+0000');

  const files = walkHtmlFiles(WEB)
    .filter(f => !['shared.css', 'shared.js'].includes(path.basename(f)))
    .map(f => ({ f, mtime: fs.statSync(f).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, MAX_ITEMS);

  const items = files.map(({ f, mtime }) => {
    const content = fs.readFileSync(f, 'utf8');
    const titleM = content.match(/<title>([^<]+)<\/title>/);
    const title = titleM ? titleM[1].trim().replace(/\s*[|—–-]\s*BizFirstAI.*$/, '') : path.basename(f, '.html').replace(/-/g, ' ');
    const descM = content.match(/<meta\s+name="description"\s+content="([^"]+)"/);
    const desc = descM ? descM[1].trim().slice(0, 300) : 'BizFirstAI documentation guide.';
    const rel = path.relative(DOCS, f).split(path.sep).join('/');
    const url = path.basename(f) === 'index.html'
      ? BASE_URL + '/' + path.relative(DOCS, path.dirname(f)).split(path.sep).join('/') + '/'
      : BASE_URL + '/' + rel;
    const pub = new Date(mtime).toUTCString().replace(/GMT$/, '+0000');
    return `  <item>\n    <title>${esc(title)}</title>\n    <link>${esc(url)}</link>\n    <description>${esc(desc)}</description>\n    <pubDate>${pub}</pubDate>\n    <guid isPermaLink="true">${esc(url)}</guid>\n  </item>`;
  });

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BizFirstAI Documentation</title>
    <link>${BASE_URL}/</link>
    <description>Guides, references, and deep-dives for BizFirstAI — AI-powered workflow automation for finance and operations teams.</description>
    <language>en-us</language>
    <lastBuildDate>${nowRfc}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items.join('\n')}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(DOCS, 'feed.xml'), feed, 'utf8');
  console.log(`feed.xml — ${items.length} items written`);
}

// ── Step: generate sitemap ──────────────────────────────────────────
function generateSitemap() {
  const SKIP_DIRS = new Set(['pagefind', 'AtlasForms', '_next', '.git']);
  const today = new Date().toISOString().slice(0, 10);

  function priority(depth, isIndex) {
    if (depth === 1 && isIndex) return '1.0';
    if (depth === 2 && isIndex) return '0.9';
    if (depth === 3 && isIndex) return '0.8';
    if (depth === 4 && isIndex) return '0.7';
    if (depth <= 3) return '0.6';
    return '0.5';
  }

  const entries = [];
  (function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const dirs = items.filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name)).sort((a, b) => a.name.localeCompare(b.name));
    const files = items.filter(e => e.isFile() && e.name.endsWith('.html')).sort((a, b) => a.name.localeCompare(b.name));

    for (const file of files) {
      const full = path.join(dir, file.name);
      const rel = path.relative(DOCS, full).split(path.sep).join('/');
      const parts = rel.split('/');
      const isIndex = file.name === 'index.html';
      let url;
      if (isIndex) {
        const parent = parts.slice(0, -1);
        url = BASE_URL + (parent.length === 0 ? '/' : '/' + parent.join('/') + '/');
      } else {
        url = BASE_URL + '/' + rel;
      }
      entries.push([url, priority(parts.length, isIndex)]);
    }
    for (const d of dirs) walk(path.join(dir, d.name));
  })(DOCS);

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const [url, pri] of entries) {
    lines.push('  <url>', `    <loc>${url}</loc>`, `    <lastmod>${today}</lastmod>`, `    <priority>${pri}</priority>`, '  </url>');
  }
  lines.push('</urlset>');

  fs.writeFileSync(path.join(DOCS, 'sitemap.xml'), lines.join('\n') + '\n', 'utf8');
  console.log(`sitemap.xml — ${entries.length} URLs written`);
}

// ── Step: check broken internal links ───────────────────────────────
function checkBrokenLinks() {
  const SKIP_PREFIXES = ['http://', 'https://', '//', 'mailto:', 'tel:', '#', 'javascript:', 'data:', '/'];
  const errors = [];

  for (const f of walkHtmlFiles(DOCS).sort()) {
    const content = fs.readFileSync(f, 'utf8');
    const scan = content.replace(/&lt;[^&>]*href=["'][^"']*["'][^&>]*&gt;/g, '');
    const hrefRe = /href=["']([^"']+)["']/g;
    let m;
    while ((m = hrefRe.exec(scan))) {
      let href = decodeURIComponent(m[1].split('#')[0].split('?')[0]);
      if (!href || SKIP_PREFIXES.some(p => href.startsWith(p))) continue;
      if (href.includes('{')) continue;

      const target = path.resolve(path.dirname(f), href);
      const docsRoot = path.resolve(DOCS);
      if (!target.startsWith(docsRoot)) continue;

      if (!fs.existsSync(target)) {
        errors.push(`  ${path.relative(DOCS, f)}  →  ${href}`);
      }
    }
  }

  if (errors.length) {
    console.log(`\n❌ BROKEN INTERNAL LINKS (${errors.length} found):\n`);
    for (const e of errors) console.log(e);
    console.log('\nFix the links above before pushing.\n');
    process.exitCode = 1;
    return false;
  }
  console.log('✅ All internal links valid');
  return true;
}

// ── Step: build Pagefind search index ───────────────────────────────
function buildPagefindIndex() {
  if (SKIP_PAGEFIND) {
    console.log('Pagefind build skipped (--skip-pagefind)');
    return;
  }
  const res = spawnSync('npx', ['pagefind@latest', '--site', 'docs'], { cwd: ROOT, stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    console.log('⚠️  Pagefind build failed (non-fatal, continuing)');
  }
}

async function main() {
  generateWhatsNew();
  generateCoverage();
  injectDocsRepoMeta();
  injectOpenGraphTags();
  distributeSharedJs();
  markSidebarNav();
  await fetchAndIndexBlog();
  generateRssFeed();
  generateSitemap();
  const linksOk = checkBrokenLinks();
  buildPagefindIndex();

  if (!linksOk) {
    console.log('\nBuild completed WITH broken-link errors — review before committing.');
    process.exit(1);
  }
  console.log('\nBuild complete.');
}

main();
