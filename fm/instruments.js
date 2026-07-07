/* =============================================================
   PORTAIL FM — Répertoire d'instruments (logique vanilla)
   -------------------------------------------------------------
   Deux vues :
     • « tessiture » — instruments rangés par registre (grave/médium/aigu),
       avec la voix équivalente.
     • « fonction »  — chaque rôle du groove et ses instruments ÉQUIVALENTS ;
       le·la musicien·ne choisit son option (instrument + technique).

   Le choix par rôle est mémorisé :
     localStorage  fm-instruments-choix = { <fonctionId>: {instrument, technique} }
   Exportable en JSON (« ma ligne ») pour travailler seul·e chez soi.
   ============================================================= */
(function () {
  'use strict';

  var D = window.FM_INSTRUMENTS;
  var CHOIX_KEY = 'fm-instruments-choix';
  var vue = 'tessiture';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- Choix persistés ----
  function readChoix() {
    try { return JSON.parse(localStorage.getItem(CHOIX_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeChoix(c) {
    try { localStorage.setItem(CHOIX_KEY, JSON.stringify(c)); } catch (e) {}
  }
  function optKey(o) { return o.instrument + '|' + (o.technique || ''); }
  function labelOption(o) {
    var inst = D.instrumentsById[o.instrument];
    var nom = inst ? inst.nom : o.instrument;
    return o.technique ? nom + ' · ' + o.technique : nom;
  }

  // ============================================================
  // VUE « TESSITURE »
  // ============================================================
  function renderTessiture() {
    var html = '';
    D.registres.forEach(function (r) {
      var instrs = D.instrumentsByRegistre(r.id);
      html +=
        '<section style="margin-bottom:30px;">' +
          '<div style="display:flex; align-items:baseline; gap:12px; border-bottom:1px solid var(--line,rgba(107,74,46,.16)); padding-bottom:10px; margin-bottom:14px;">' +
            '<span style="font-family:\'Cormorant Garamond\',serif; font-size:30px; color:var(--acc,#b3763b);">' + esc(r.symbole) + '</span>' +
            '<h2 style="font-family:\'Cormorant Garamond\',serif; font-weight:600; font-size:26px; color:var(--ink,#2a221b); margin:0;">' + esc(r.nom) + '</h2>' +
            '<span style="font-family:\'JetBrains Mono\',monospace; font-size:11px; letter-spacing:.14em; color:var(--acc,#b3763b); text-transform:uppercase;">VOIX · ' + esc(r.voix) + '</span>' +
          '</div>' +
          '<p style="font-size:13.5px; color:var(--sub,#6b5d4c); margin:0 0 14px; line-height:1.6;">' + esc(r.resume) + '</p>' +
          '<div class="fm-grid3" style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px;">';

      instrs.forEach(function (i) {
        html +=
          '<div style="background:var(--panel,#f7f1e6); border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:12px; padding:14px 16px;">' +
            '<div style="font-family:\'Cormorant Garamond\',serif; font-size:19px; color:var(--ink,#2a221b); line-height:1.1;">' + esc(i.nom) + '</div>' +
            '<div style="font-family:\'JetBrains Mono\',monospace; font-size:10px; letter-spacing:.12em; color:var(--acc,#b3763b); text-transform:uppercase; margin:6px 0 8px;">' + esc(i.famille) + '</div>' +
            '<div style="font-size:12px; color:var(--sub,#6b5d4c); line-height:1.5;">' +
              (i.techniques && i.techniques.length ? 'Techniques : ' + esc(i.techniques.join(', ')) : '&nbsp;') +
            '</div>' +
          '</div>';
      });

      html += '</div></section>';
    });
    return html;
  }

  // ============================================================
  // VUE « FONCTION » (équivalences + choix personnel)
  // ============================================================
  function renderFonction() {
    var choix = readChoix();
    var html =
      '<p style="font-size:13px; color:var(--sub,#6b5d4c); margin:0 0 20px; line-height:1.6;">' +
        'Cliquez sur l\'instrument que <strong>vous</strong> jouez pour chaque rôle. ' +
        'Votre choix est retenu sur cet appareil — exportez-le en JSON pour le travailler chez vous.' +
      '</p>';

    D.fonctions.forEach(function (f) {
      var reg = D.registresById[f.registre] || {};
      var sel = choix[f.id] ? optKey(choix[f.id]) : null;

      html +=
        '<section style="background:var(--panel,#f7f1e6); border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:14px; padding:18px 20px; margin-bottom:16px;">' +
          '<div style="display:flex; align-items:baseline; gap:10px; flex-wrap:wrap;">' +
            '<h2 style="font-family:\'Cormorant Garamond\',serif; font-weight:600; font-size:23px; color:var(--ink,#2a221b); margin:0;">' + esc(f.nom) + '</h2>' +
            '<span style="font-family:\'JetBrains Mono\',monospace; font-size:10px; letter-spacing:.14em; color:var(--acc,#b3763b); text-transform:uppercase; border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:999px; padding:3px 9px;">' + esc(reg.nom || '') + ' · ' + esc(reg.voix || '') + '</span>' +
          '</div>' +
          '<p style="font-size:13px; color:var(--sub,#6b5d4c); margin:8px 0 14px; line-height:1.6;">' + esc(f.role) + '</p>' +
          '<div style="display:flex; gap:9px; flex-wrap:wrap;">';

      f.options.forEach(function (o) {
        var k = optKey(o);
        var pressed = (sel === k) ? 'true' : 'false';
        html +=
          '<span class="fm-opt" role="button" tabindex="0" aria-pressed="' + pressed + '"' +
            ' data-fonction="' + esc(f.id) + '" data-instrument="' + esc(o.instrument) + '" data-technique="' + esc(o.technique || '') + '"' +
            ' style="display:inline-block; background:var(--panel2,#f0e7d6); border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:999px; padding:8px 14px; font-size:13px;">' +
            esc(labelOption(o)) +
          '</span>';
      });

      html += '</div></section>';
    });

    return html;
  }

  // ---- Sélection d'une option (délégation d'événements) ----
  function onOptActivate(el) {
    var fonctionId = el.getAttribute('data-fonction');
    var instrument = el.getAttribute('data-instrument');
    var technique = el.getAttribute('data-technique') || '';
    var choix = readChoix();
    var current = choix[fonctionId];
    // Re-cliquer sur le choix courant le retire (aucun instrument imposé).
    if (current && current.instrument === instrument && (current.technique || '') === technique) {
      delete choix[fonctionId];
    } else {
      choix[fonctionId] = technique ? { instrument: instrument, technique: technique } : { instrument: instrument };
    }
    writeChoix(choix);
    render();
  }

  // ============================================================
  // Export « ma ligne » en JSON
  // ============================================================
  function exporterChoix() {
    var choix = readChoix();
    var pseudo = '';
    try { pseudo = (JSON.parse(localStorage.getItem('fm-eleve')) || {}).pseudo || ''; } catch (e) {}

    var ligne = {
      type: 'fm-ligne-instruments',
      version: 1,
      eleve: pseudo || null,
      roles: D.fonctions.map(function (f) {
        var c = choix[f.id];
        return {
          fonction: f.id,
          nom: f.nom,
          registre: f.registre,
          instrument: c ? c.instrument : null,
          technique: c && c.technique ? c.technique : null,
          libelle: c ? labelOption(c) : null
        };
      }).filter(function (r) { return r.instrument; })
    };

    if (!ligne.roles.length) {
      alert('Choisissez d\'abord au moins un instrument dans la vue « Par rôle ».');
      return;
    }

    var blob = new Blob([JSON.stringify(ligne, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'ma-ligne' + (pseudo ? '-' + pseudo.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  window.exporterChoix = exporterChoix;

  // ============================================================
  // Rendu + navigation entre vues
  // ============================================================
  function render() {
    var zone = document.getElementById('vueZone');
    zone.innerHTML = (vue === 'fonction') ? renderFonction() : renderTessiture();

    // reflet visuel de l'onglet actif
    ['tessiture', 'fonction'].forEach(function (v) {
      var b = document.getElementById('vue' + v.charAt(0).toUpperCase() + v.slice(1));
      if (!b) return;
      var on = (v === vue);
      b.style.background = on ? 'var(--acc,#b3763b)' : 'var(--panel,#f7f1e6)';
      b.style.color = on ? 'var(--accInk,#f7f1e6)' : 'var(--ink,#2a221b)';
      b.style.borderColor = on ? 'var(--acc,#b3763b)' : 'var(--line,rgba(107,74,46,.16))';
    });
  }
  window.setVue = function (v) { vue = v; render(); };

  // Délégation : clic + clavier sur les options.
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.fm-opt') : null;
    if (el) onOptActivate(el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest ? e.target.closest('.fm-opt') : null;
    if (el) { e.preventDefault(); onOptActivate(el); }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
