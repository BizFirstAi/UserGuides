/* BizFirst Deployment Models V2 - shared left sidebar navigation
   Injected into <aside id="sidebar-nav"></aside> present on every page. */
(function () {
  var NAV = [
    {
      title: 'Chapter 1 — Concepts',
      pages: [
        { href: 'c1-environment-overview.html', num: '1.1', title: 'Environment Management Overview' },
        { href: 'c1-environment-names.html', num: '1.2', title: 'Environment Names: Servers vs React Apps' },
        { href: 'c1-reading-env-vars.html', num: '1.3', title: 'How .NET and React Read Env Vars' },
        { href: 'c1-deployment-types.html', num: '1.4', title: 'Deployment Types of React Apps' },
        { href: 'c1-inline-app-server.html', num: '1.5', title: 'Inline App Server' },
        { href: 'c1-independent-app-server.html', num: '1.6', title: 'Independent App Server' }
      ]
    },
    {
      title: 'Chapter 2 — How It Works in BizFirst',
      pages: [
        { href: 'c2-scenarios-samples.html', num: '2.1', title: 'Scenarios & Samples' },
        { href: 'c2-flow-config.html', num: '2.2', title: 'Environment Configuration in Flow' },
        { href: 'c2-flowstudio-config.html', num: '2.3', title: 'Environment Configuration in FlowStudio' },
        { href: 'c2-calculateapiurl.html', num: '2.4', title: 'Empty vs /api Path — Resolution Explained' }
      ]
    },
    {
      title: 'Chapter 3 — Guidelines',
      pages: [
        { href: 'c3-checklist.html', num: '3.1', title: 'Configuration Checklist' },
        { href: 'c3-debugging.html', num: '3.2', title: 'How to Debug' }
      ]
    }
  ];

  var HOME_ICON =
    '<svg class="icon" viewBox="0 0 24 24"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-6h4v6"/></svg>';

  function currentFile() {
    var parts = window.location.pathname.split('/');
    var last = parts[parts.length - 1];
    return last === '' ? 'index.html' : last;
  }

  function render() {
    var mount = document.getElementById('sidebar-nav');
    if (!mount) return;
    var current = currentFile();
    var html = '';
    html += '<a class="sidebar-home" href="index.html">' + HOME_ICON + '<span>Deployment Models Home</span></a>';

    NAV.forEach(function (chapter) {
      html += '<div class="nav-chapter"><div class="nav-chapter-title">' + chapter.title + '</div><ul>';
      chapter.pages.forEach(function (page) {
        var active = page.href === current ? ' active' : '';
        html +=
          '<li><a class="nav-link' + active + '" href="' + page.href + '">' +
          '<span class="nav-num">' + page.num + '</span><span>' + page.title + '</span>' +
          '</a></li>';
      });
      html += '</ul></div>';
    });

    mount.innerHTML = html;
  }

  function wireToggle() {
    var toggle = document.getElementById('sidebar-toggle');
    var layout = document.getElementById('layout');
    if (!toggle || !layout) return;
    toggle.addEventListener('click', function () {
      layout.classList.toggle('sidebar-open');
    });
    layout.addEventListener('click', function (evt) {
      if (evt.target === layout || (layout.classList.contains('sidebar-open') && evt.target.closest === undefined)) {
        return;
      }
    });
    document.addEventListener('click', function (evt) {
      if (!layout.classList.contains('sidebar-open')) return;
      var sidebar = document.querySelector('.sidebar');
      if (sidebar && !sidebar.contains(evt.target) && evt.target !== toggle && !toggle.contains(evt.target)) {
        layout.classList.remove('sidebar-open');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    wireToggle();
  });

  // Expose the nav structure for building prev/next pagers per page.
  window.BIZFIRST_NAV = NAV;
})();
