(function () {
  'use strict';

  var BASE = '';

  var css = [
    /* --- topbar button --- */
    '#bfai-search-btn{font-size:12px;color:#b0c4d8;text-decoration:none;padding:4px 12px;border-radius:5px;',
    'display:flex;align-items:center;gap:6px;cursor:pointer;background:none;border:none;font-family:inherit;',
    'transition:background .15s,color .15s;}',
    '#bfai-search-btn:hover{background:rgba(255,255,255,.08);color:#fff;}',
    '#bfai-search-btn kbd{font-size:10px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);',
    'border-radius:3px;padding:1px 5px;font-family:inherit;color:#8892b0;}',

    /* --- full-screen overlay --- */
    '#bfai-search-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9999;',
    'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
    'flex-direction:column;}',
    '#bfai-search-overlay.open{display:flex;}',

    /* --- modal fills screen --- */
    '#bfai-search-modal{background:#13151f;display:flex;flex-direction:column;',
    'width:100%;height:100%;overflow:hidden;}',

    /* --- top bar inside modal --- */
    '#bfai-search-bar{display:flex;align-items:center;gap:12px;padding:14px 24px;',
    'border-bottom:1px solid #2e3250;flex-shrink:0;background:#1a1d27;}',
    '#bfai-search-bar>i{color:#6c8cff;font-size:18px;flex-shrink:0;}',
    '#bfai-search-input{flex:1;background:transparent;border:none;outline:none;color:#e2e8f0;',
    'font-size:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
    '#bfai-search-input::placeholder{color:#3a4460;}',

    '#bfai-search-clear{background:none;border:none;color:#4a5568;cursor:pointer;font-size:20px;',
    'padding:2px 8px;border-radius:4px;line-height:1;display:none;}',
    '#bfai-search-clear.visible{display:block;}',
    '#bfai-search-clear:hover{color:#e2e8f0;background:rgba(255,255,255,.08);}',

    '#bfai-search-close{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);',
    'color:#8892b0;cursor:pointer;font-size:12px;padding:5px 10px;border-radius:5px;',
    'font-family:inherit;flex-shrink:0;transition:background .15s,color .15s;}',
    '#bfai-search-close:hover{color:#fff;background:rgba(255,255,255,.12);}',

    /* --- results area --- */
    '#bfai-search-body{display:flex;flex:1;overflow:hidden;}',
    '#bfai-search-results{flex:1;overflow-y:auto;padding:0;}',

    /* --- sidebar counts (future) --- */

    /* --- result items --- */
    '.bfai-sr{display:block;padding:16px 28px;border-bottom:1px solid #1a1d2a;',
    'text-decoration:none;transition:background .1s;}',
    '.bfai-sr:hover{background:rgba(108,140,255,.06);}',
    '.bfai-sr-title{font-size:15px;font-weight:600;color:#6c8cff;margin-bottom:5px;}',
    '.bfai-sr-excerpt{font-size:13px;color:#8892b0;line-height:1.6;}',
    '.bfai-sr-excerpt mark{background:none;color:#a78bfa;font-weight:600;}',
    '.bfai-sr-section{font-size:11px;color:#3a4460;margin-top:4px;letter-spacing:.04em;text-transform:uppercase;}',

    /* --- hint / empty --- */
    '#bfai-search-hint{padding:60px 28px;text-align:center;color:#3a4460;font-size:14px;line-height:1.8;}',
    '#bfai-search-hint h2{font-size:20px;color:#4a5568;margin-bottom:8px;}',
    '#bfai-search-empty{padding:60px 28px;text-align:center;color:#4a5568;font-size:14px;display:none;}',

    /* --- load more --- */
    '#bfai-search-more{display:block;width:100%;padding:14px;background:none;border:none;',
    'border-top:1px solid #2e3250;color:#6c8cff;font-size:13px;cursor:pointer;font-family:inherit;}',
    '#bfai-search-more:hover{background:rgba(108,140,255,.07);}',

    /* --- footer bar --- */
    '#bfai-search-footer{display:flex;align-items:center;justify-content:space-between;',
    'padding:8px 24px;border-top:1px solid #1e2233;background:#1a1d27;flex-shrink:0;',
    'font-size:12px;color:#3a4460;}',
    '#bfai-search-footer a{color:#6c8cff;text-decoration:none;}',
    '#bfai-search-footer a:hover{text-decoration:underline;}',
    '.bfai-search-kbd{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);',
    'border-radius:3px;padding:2px 6px;font-size:11px;color:#8892b0;font-family:inherit;}'
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
  var PAGE_SIZE = 12;
  var debounceTimer = null;

  function injectStyles() {
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function loadPagefind() {
    if (pagefind) return Promise.resolve(pagefind);
    return import(BASE + '/pagefind/pagefind.js').then(function (pf) {
      return pf.init().then(function () { pagefind = pf; return pf; });
    }).catch(function (e) {
      console.warn('[BizFirstAI Search] Pagefind index not available yet.', e);
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
          '<input id="bfai-search-input" type="text" placeholder="Search all BizFirstAI documentation…" autocomplete="off" spellcheck="false">' +
          '<button id="bfai-search-clear" aria-label="Clear">✕</button>' +
          '<button id="bfai-search-close">ESC</button>' +
        '</div>' +
        '<div id="bfai-search-body">' +
          '<div id="bfai-search-results">' +
            '<div id="bfai-search-hint"><h2>What are you looking for?</h2>Search across Atlas Forms, Octopus, Flow Studio, Passport,<br>EdgeStream, WorkDesk, and all other BizFirstAI product guides.</div>' +
            '<div id="bfai-search-empty">No results found. Try different keywords.</div>' +
          '</div>' +
        '</div>' +
        '<div id="bfai-search-footer">' +
          '<span><kbd class="bfai-search-kbd">↑↓</kbd> navigate &nbsp; <kbd class="bfai-search-kbd">↵</kbd> open &nbsp; <kbd class="bfai-search-kbd">ESC</kbd> close</span>' +
          '<a href="/search.html">Open dedicated search page →</a>' +
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
    inputEl.addEventListener('keydown', onKeyNav);
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
    debounceTimer = setTimeout(function () { runSearch(q); }, 200);
  }

  var focusedIndex = -1;
  function onKeyNav(e) {
    var items = resultsEl.querySelectorAll('.bfai-sr');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
      items[focusedIndex].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, -1);
      if (focusedIndex === -1) inputEl.focus();
      else items[focusedIndex].focus();
    }
  }

  function resetResults() {
    hintEl.style.display = '';
    emptyEl.style.display = 'none';
    clearResultItems();
    allResults = [];
    shown = 0;
    focusedIndex = -1;
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
        focusedIndex = -1;
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
    return Promise.all(batch.map(function (r) { return r.data(); })).then(function (datas) {
      datas.forEach(function (data) {
        var a = document.createElement('a');
        a.className = 'bfai-sr';
        a.href = data.url;
        a.tabIndex = 0;
        var title = (data.meta && data.meta.title) ? escHtml(data.meta.title) : 'Untitled';
        var excerpt = safeExcerpt(data.excerpt || '');
        var section = data.url.replace(/^\//, '').split('/').slice(0, 2).join(' › ');
        a.innerHTML =
          '<div class="bfai-sr-section">' + escHtml(section) + '</div>' +
          '<div class="bfai-sr-title">' + title + '</div>' +
          '<div class="bfai-sr-excerpt">' + excerpt + '</div>';
        resultsEl.appendChild(a);
      });
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
    return s.replace(/</g,'\x00').replace(/\x00mark>/g,'<mark>').replace(/\x00\/mark>/g,'</mark>').replace(/\x00\S*?>/g,'');
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
    if (document.getElementById('bfai-search-btn')) return;
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
