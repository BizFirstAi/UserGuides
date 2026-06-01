/* BizFirstAI Docs — shared enhancements
   Features: reading time, copy-code buttons, feedback widget, embed mode
   Loaded by all guide pages via <script src="../shared.js"> (injected by CI)
*/
(function () {
  'use strict';

  function init() {
    handleEmbedMode();
    addReadingTime();
    addCopyButtons();
    addFeedbackWidget();
  }

  /* ── 1. Embed mode ──────────────────────────────────────────────────────
     ?embed=1 (or ?embed) strips topbar + sidebar so the page renders cleanly
     inside a Flow Studio iframe. Useful for contextual help panels.
  */
  function handleEmbedMode() {
    var params = new URLSearchParams(window.location.search);
    if (!params.has('embed')) return;

    ['.bfai-topbar', 'nav.sidebar', '.sidebar'].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.style.display = 'none';
      });
    });

    var layout = document.querySelector('.layout');
    if (layout) {
      layout.style.display = 'block';
      layout.style.minHeight = '100vh';
    }

    var content = document.querySelector('main.content, .content');
    if (content) {
      content.style.maxWidth = '100%';
      content.style.padding = '24px 32px';
    }

    document.body.style.paddingTop = '0';
  }

  /* ── 2. Reading time ───────────────────────────────────────────────────
     Counts words in the main content area and injects "~N min read" below
     the .lead paragraph in the .page-header.
  */
  function addReadingTime() {
    var content = document.querySelector('main.content, .content');
    var header  = document.querySelector('.page-header');
    if (!content || !header) return;

    var text  = content.innerText || content.textContent || '';
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var mins  = Math.max(1, Math.round(words / 200));

    var span = document.createElement('span');
    span.className = 'reading-time';
    span.style.cssText = [
      'font-size:0.72rem',
      'color:var(--text-dim,#4a5568)',
      'margin-top:10px',
      'display:inline-flex',
      'align-items:center',
      'gap:5px',
    ].join(';');
    span.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
      '~' + mins + ' min read';

    var lead = header.querySelector('.lead');
    if (lead) {
      lead.insertAdjacentElement('afterend', span);
    } else {
      header.appendChild(span);
    }
  }

  /* ── 3. Copy-code buttons ──────────────────────────────────────────────
     Adds a "Copy" button that appears on hover over each <pre> block.
     Uses Clipboard API with execCommand fallback.
  */
  function addCopyButtons() {
    document.querySelectorAll('pre').forEach(function (pre) {
      if (pre.querySelector('.copy-btn')) return;

      var btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.style.cssText = [
        'position:absolute',
        'top:8px',
        'right:8px',
        'background:var(--surface,#22263a)',
        'color:var(--text-muted,#8892b0)',
        'border:1px solid var(--border,#2e3250)',
        'border-radius:5px',
        'padding:3px 11px',
        'font-size:0.71rem',
        'font-family:inherit',
        'cursor:pointer',
        'opacity:0',
        'transition:opacity 0.15s,color 0.15s,background 0.15s',
        'z-index:10',
      ].join(';');

      pre.style.position = 'relative';
      pre.appendChild(btn);

      pre.addEventListener('mouseenter', function () { btn.style.opacity = '1'; });
      pre.addEventListener('mouseleave', function () { btn.style.opacity = '0'; });

      btn.addEventListener('click', function () {
        var code = pre.querySelector('code');
        var text = (code || pre).innerText || (code || pre).textContent || '';

        function onCopied() {
          btn.textContent = 'Copied!';
          btn.style.color = 'var(--success,#34d399)';
          btn.style.borderColor = 'rgba(52,211,153,0.4)';
          setTimeout(function () {
            btn.textContent = 'Copy';
            btn.style.color = 'var(--text-muted,#8892b0)';
            btn.style.borderColor = 'var(--border,#2e3250)';
          }, 2000);
        }

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(onCopied).catch(function () {
            fallbackCopy(text);
            onCopied();
          });
        } else {
          fallbackCopy(text);
          onCopied();
        }
      });
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* silent */ }
    document.body.removeChild(ta);
  }

  /* ── 4. Feedback widget ────────────────────────────────────────────────
     Appends "Was this page helpful?" bar at the bottom of main content.
     Thumbs-up / down open a pre-filled GitHub Issue. Zero backend needed.
     The repo is read from <meta name="docs-repo"> injected by CI.
  */
  function addFeedbackWidget() {
    var content = document.querySelector('main.content, .content');
    if (!content) return;

    var repoMeta = document.querySelector('meta[name="docs-repo"]');
    var repo     = repoMeta ? repoMeta.getAttribute('content') : 'bizfirstai/UserGuides';

    var pageTitle = encodeURIComponent(document.title);
    var pageUrl   = encodeURIComponent(window.location.href);

    var upUrl   = 'https://github.com/' + repo + '/issues/new' +
      '?labels=feedback%2C%F0%9F%91%8D-helpful' +
      '&title=' + encodeURIComponent('👍 Helpful: ') + pageTitle +
      '&body=' + encodeURIComponent('The following page was helpful:\n\n') + pageUrl;

    var downUrl = 'https://github.com/' + repo + '/issues/new' +
      '?labels=feedback%2C%F0%9F%91%8E-needs-improvement' +
      '&title=' + encodeURIComponent('👎 Needs improvement: ') + pageTitle +
      '&body=' + encodeURIComponent('**Page:** ') + pageUrl +
        encodeURIComponent('\n\n**What was unclear or missing?**\n\n');

    var widget = document.createElement('div');
    widget.className = 'feedback-widget';
    widget.style.cssText = [
      'margin-top:60px',
      'padding:18px 24px',
      'background:var(--surface,#1a1d27)',
      'border:1px solid var(--border,#2e3250)',
      'border-radius:10px',
      'display:flex',
      'align-items:center',
      'gap:14px',
      'flex-wrap:wrap',
    ].join(';');

    var label = document.createElement('span');
    label.style.cssText = 'font-size:0.875rem;color:var(--text-muted,#8892b0);flex:1;min-width:160px;';
    label.textContent = 'Was this page helpful?';

    var upBtn   = makeBtn('👍 Yes, helpful',   upUrl,   'rgba(52,211,153,0.1)',  '#34d399',  'rgba(52,211,153,0.3)');
    var downBtn = makeBtn('👎 Needs work',     downUrl, 'rgba(248,113,113,0.1)', '#f87171',  'rgba(248,113,113,0.3)');

    widget.appendChild(label);
    widget.appendChild(upBtn);
    widget.appendChild(downBtn);
    content.appendChild(widget);
  }

  function makeBtn(text, href, bg, color, borderColor) {
    var a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = text;
    a.style.cssText = [
      'text-decoration:none',
      'padding:6px 16px',
      'background:' + bg,
      'color:' + color,
      'border:1px solid ' + borderColor,
      'border-radius:6px',
      'font-size:0.82rem',
      'transition:background 0.15s',
      'white-space:nowrap',
    ].join(';');
    a.addEventListener('mouseenter', function () {
      this.style.background = bg.replace('0.1', '0.2');
    });
    a.addEventListener('mouseleave', function () {
      this.style.background = bg;
    });
    return a;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
