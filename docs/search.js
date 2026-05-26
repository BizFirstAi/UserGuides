(function () {
  'use strict';

  var BASE = '';

  var css = [
    '#bfai-search-btn{font-size:12px;color:#b0c4d8;text-decoration:none;padding:4px 12px;border-radius:5px;',
    'display:flex;align-items:center;gap:6px;cursor:pointer;background:none;border:none;font-family:inherit;',
    'transition:background .15s,color .15s;}',
    '#bfai-search-btn:hover{background:rgba(255,255,255,.08);color:#fff;}',
    '#bfai-search-btn kbd{font-size:10px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);',
    'border-radius:3px;padding:1px 5px;font-family:inherit;color:#8892b0;}',

    '#bfai-search-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;',
    'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
    'align-items:flex-start;justify-content:center;padding:80px 20px 20px;}',
    '#bfai-search-overlay.open{display:flex;}',

    '#bfai-search-modal{background:#1a1d27;border:1px solid #2e3250;border-radius:12px;width:100%;',
    'max-width:660px;max-height:calc(100vh - 120px);display:flex;flex-direction:column;',
    'box-shadow:0 24px 64px rgba(0,0,0,.6);overflow:hidden;}',

    '#bfai-search-bar{display:flex;align-items:center;gap:10px;padding:12px 16px;',
    'border-bottom:1px solid #2e3250;flex-shrink:0;}',
    '#bfai-search-bar>i{color:#6c8cff;font-size:15px;flex-shrink:0;}',

    '#bfai-search-input{flex:1;background:transparent;border:none;outline:none;color:#e2e8f0;',
    'font-size:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
    '#bfai-search-input::placeholder{color:#4a5568;}',

    '#bfai-search-clear{background:none;border:none;color:#4a5568;cursor:pointer;font-size:18px;',
    'padding:2px 6px;border-radius:4px;line-height:1;display:none;}',
    '#bfai-search-clear.visible{display:block;}',
    '#bfai-search-clear:hover{color:#e2e8f0;background:rgba(255,255,255,.08);}',

    '#bfai-search-close{background:none;border:none;color:#8892b0;cursor:pointer;font-size:12px;',
    'padding:4px 8px;border-radius:4px;font-family:inherit;flex-shrink:0;}',
    '#bfai-search-close:hover{color:#fff;background:rgba(255,255,255,.1);}',

    '#bfai-search-results{overflow-y:auto;flex:1;}',

    '.bfai-sr{display:block;padding:14px 16px;border-bottom:1px solid #1e2233;',
    'text-decoration:none;transition:background .12s;cursor:pointer;}',
    '.bfai-sr:hover{background:rgba(108,140,255,.07);}',
    '.bfai-sr-title{font-size:14px;font-weight:600;color:#6c8cff;margin-bottom:4px;}',
    '.bfai-sr-excerpt{font-size:13px;color:#8892b0;line-height:1.5;}',
    '.bfai-sr-excerpt mark{background:none;color:#a78bfa;font-weight:600;}',

    '#bfai-search-hint,#bfai-search-empty{padding:28px 16px;text-align:center;',
    'color:#4a5568;font-size:13px;}',
    '#bfai-search-empty{display:none;}',

    '#bfai-search-more{display:block;width:100%;padding:12px;background:none;border:none;',
    'border-top:1px solid #2e3250;color:#6c8cff;font-size:13px;cursor:pointer;font-family:inherit;}',
    '#bfai-search-more:hover{background:rgba(108,140,255,.07);}'
  ].join('');

  var pagefind = null;
  var overlay = null;
  var inputEl = null;
  var resultsEl = null;
  var clearBtn = null;
  var emptyEl = null;
  var hintEl = null;
  var allResults = [];
  var shown = 0;
  var PAGE_SIZE = 8;
  var debounceTimer = null;

  function injectStyles() {
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function loadPagefind() {
    if (pagefind) return Promise.resolve(pagefind);
    return import(BASE + '/pagefind/pagefind.js').then(function (pf) {
      return pf.init().then(function () {
        pagefind = pf;
        return pf;
      });
    }).catch(function (e) {
      console.warn('[BizFirstAI Search] Pagefind index not found. Run the deploy workflow to build it.', e);
      return null;
    });
  }

  function buildModal() {
    overlay = document.createElement('div');
    overlay.id = 'bfai-search-overlay';
    overlay.innerHTML =
      '<div id="bfai-search-modal">' +
        '<div id="bfai-search-bar">' +
          '<i class="fa-solid fa-magnifying-glass"></i>' +
          '<input id="bfai-search-input" type="text" placeholder="Search documentation…" autocomplete="off" spellcheck="false">' +
          '<button id="bfai-search-clear" aria-label="Clear">✕</button>' +
          '<button id="bfai-search-close">ESC</button>' +
        '</div>' +
        '<div id="bfai-search-results">' +
          '<div id="bfai-search-hint">Type to search across all BizFirstAI documentation…</div>' +
          '<div id="bfai-search-empty">No results found.</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    inputEl   = document.getElementById('bfai-search-input');
    resultsEl = document.getElementById('bfai-search-results');
    clearBtn  = document.getElementById('bfai-search-clear');
    emptyEl   = document.getElementById('bfai-search-empty');
    hintEl    = document.getElementById('bfai-search-hint');

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.getElementById('bfai-search-close').addEventListener('click', closeModal);
    inputEl.addEventListener('input', onInput);
    clearBtn.addEventListener('click', function () {
      inputEl.value = '';
      clearBtn.classList.remove('visible');
      resetResults();
      inputEl.focus();
    });
  }

  function onInput() {
    var q = inputEl.value.trim();
    clearBtn.classList.toggle('visible', q.length > 0);
    clearTimeout(debounceTimer);
    if (!q) { resetResults(); return; }
    debounceTimer = setTimeout(function () { runSearch(q); }, 220);
  }

  function resetResults() {
    hintEl.style.display = '';
    emptyEl.style.display = 'none';
    clearResultItems();
    allResults = [];
    shown = 0;
  }

  function clearResultItems() {
    var items = resultsEl.querySelectorAll('.bfai-sr, #bfai-search-more');
    for (var i = 0; i < items.length; i++) items[i].remove();
  }

  function runSearch(q) {
    loadPagefind().then(function (pf) {
      if (!pf) return;
      return pf.search(q).then(function (search) {
        allResults = search.results;
        shown = 0;
        hintEl.style.display = 'none';
        clearResultItems();
        if (!allResults.length) { emptyEl.style.display = ''; return; }
        emptyEl.style.display = 'none';
        return showMore();
      });
    });
  }

  function showMore() {
    var batch = allResults.slice(shown, shown + PAGE_SIZE);
    shown += batch.length;
    var moreBtn = document.getElementById('bfai-search-more');
    if (moreBtn) moreBtn.remove();

    var promises = batch.map(function (r) {
      return r.data().then(function (data) {
        var a = document.createElement('a');
        a.className = 'bfai-sr';
        a.href = data.url;
        var title = (data.meta && data.meta.title) ? data.meta.title : 'Untitled';
        var excerpt = data.excerpt || '';
        a.innerHTML =
          '<div class="bfai-sr-title">' + escHtml(title) + '</div>' +
          '<div class="bfai-sr-excerpt">' + safeExcerpt(excerpt) + '</div>';
        return a;
      });
    });

    return Promise.all(promises).then(function (nodes) {
      nodes.forEach(function (n) { resultsEl.appendChild(n); });
      if (shown < allResults.length) {
        var btn = document.createElement('button');
        btn.id = 'bfai-search-more';
        var rem = allResults.length - shown;
        btn.textContent = 'Show ' + rem + ' more result' + (rem === 1 ? '' : 's');
        btn.addEventListener('click', showMore);
        resultsEl.appendChild(btn);
      }
    });
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function safeExcerpt(s) {
    // Pagefind wraps matches in <mark> — allow those tags only
    return s.replace(/</g, '\x00lt\x00').replace(/\x00lt\x00mark>/g, '<mark>').replace(/\x00lt\x00\/mark>/g, '</mark>');
  }

  function openModal() {
    if (!overlay) buildModal();
    overlay.classList.add('open');
    requestAnimationFrame(function () { inputEl.focus(); });
    loadPagefind();
  }

  function closeModal() {
    if (overlay) overlay.classList.remove('open');
  }

  function addSearchButton() {
    var bar = document.querySelector('.bfai-topbar-right') || document.querySelector('.topbar-right');
    if (!bar) return;
    var btn = document.createElement('button');
    btn.id = 'bfai-search-btn';
    btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Search <kbd>Ctrl K</kbd>';
    btn.addEventListener('click', openModal);
    bar.insertBefore(btn, bar.firstChild);
  }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      (overlay && overlay.classList.contains('open')) ? closeModal() : openModal();
    }
    if (e.key === 'Escape') closeModal();
  });

  function init() {
    injectStyles();
    addSearchButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
