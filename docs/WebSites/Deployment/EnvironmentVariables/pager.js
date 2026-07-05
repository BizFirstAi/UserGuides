/* BizFirst Deployment Models V2 - auto prev/next pager
   Builds a flat page order from window.BIZFIRST_NAV (set in nav.js) and
   renders Previous/Next links into <div id="page-pager"></div>. */
(function () {
  var PREV_ICON = '<svg class="icon" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
  var NEXT_ICON = '<svg class="icon" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>';

  function currentFile() {
    var parts = window.location.pathname.split('/');
    var last = parts[parts.length - 1];
    return last === '' ? 'index.html' : last;
  }

  function flatten(nav) {
    var flat = [{ href: 'index.html', title: 'Home' }];
    nav.forEach(function (chapter) {
      chapter.pages.forEach(function (page) {
        flat.push({ href: page.href, title: page.num + ' ' + page.title });
      });
    });
    return flat;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var mount = document.getElementById('page-pager');
    if (!mount || !window.BIZFIRST_NAV) return;

    var flat = flatten(window.BIZFIRST_NAV);
    var current = currentFile();
    var idx = -1;
    flat.forEach(function (p, i) {
      if (p.href === current) idx = i;
    });
    if (idx === -1) return;

    var prev = flat[idx - 1];
    var next = flat[idx + 1];
    var html = '';

    if (prev) {
      html +=
        '<a class="pager-link prev" href="' + prev.href + '">' +
        '<span class="pager-label">' + PREV_ICON + ' Previous</span>' +
        '<span class="pager-title">' + prev.title + '</span></a>';
    } else {
      html += '<span></span>';
    }

    if (next) {
      html +=
        '<a class="pager-link next" href="' + next.href + '">' +
        '<span class="pager-label">Next ' + NEXT_ICON + '</span>' +
        '<span class="pager-title">' + next.title + '</span></a>';
    }

    mount.innerHTML = html;
  });
})();
