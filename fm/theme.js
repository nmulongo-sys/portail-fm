/* =============================================================
   PORTAIL FM — Moteur de thème vanilla (partagé)
   Contrat localStorage : fm-theme = 'clair' | 'sombre'
   Applique les jetons sur #root, met à jour le libellé du bouton
   et propage ?theme= sur les liens vers les apps (data-app).
   ============================================================= */
(function () {
  var PALETTES = {
    clair: {
      bg: '#efe7d8', panel: '#f7f1e6', panel2: '#f0e7d6',
      ink: '#2a221b', sub: '#6b5d4c', line: 'rgba(107,74,46,.16)',
      acc: '#b3763b', acc2: '#6b4a2e', accInk: '#f7f1e6',
      staff: 'rgba(107,74,46,.06)', chipA: '#e3d3ba', chipB: '#d8c5a8'
    },
    sombre: {
      bg: '#0e0e10', panel: '#17151a', panel2: '#1c1a1f',
      ink: '#f5f0e6', sub: '#b5aea2', line: 'rgba(201,162,75,.18)',
      acc: '#c9a24b', acc2: '#7a6a3a', accInk: '#0e0e10',
      staff: 'rgba(201,162,75,.05)', chipA: '#26221a', chipB: '#1a1712'
    }
  };

  // Chemins d'origine commune (GitHub Pages user site)
  var APP_BASE = {
    jam: '/jam-maker-plus/',
    lead: '/leadsheetproject/',
    magic: '/magic-drums/'
  };

  var current = 'clair';

  function readInitial() {
    try {
      var q = new URLSearchParams(location.search);
      var t = q.get('theme');
      if (t === 'clair' || t === 'sombre') return t;
      var ls = localStorage.getItem('fm-theme');
      if (ls === 'clair' || ls === 'sombre') return ls;
    } catch (e) {}
    return 'clair';
  }

  function persist(name) {
    try { localStorage.setItem('fm-theme', name); } catch (e) {}
  }

  function apply(name) {
    current = (name === 'sombre') ? 'sombre' : 'clair';
    var p = PALETTES[current];
    var root = document.getElementById('root') || document.documentElement;
    for (var k in p) { if (p.hasOwnProperty(k)) root.style.setProperty('--' + k, p[k]); }
    // reflète aussi le hook de thème pour d'éventuels styles externes
    document.documentElement.setAttribute('data-fm-theme', current);

    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = (current === 'sombre') ? '☀ Mode clair' : '☾ Mode sombre';
    }

    // liens vers les apps : recalculés avec le thème courant
    var links = document.querySelectorAll('a[data-app]');
    for (var i = 0; i < links.length; i++) {
      var key = links[i].getAttribute('data-app');
      if (APP_BASE[key]) links[i].setAttribute('href', APP_BASE[key] + '?theme=' + current);
    }

    persist(current);
    if (typeof window.onThemeApplied === 'function') window.onThemeApplied(current);
  }

  window.getTheme = function () { return current; };
  window.applyTheme = apply;
  window.toggleTheme = function () { apply(current === 'sombre' ? 'clair' : 'sombre'); };

  function init() { apply(readInitial()); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
