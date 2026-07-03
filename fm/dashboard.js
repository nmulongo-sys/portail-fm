/* =============================================================
   PORTAIL FM — Tableau de bord (logique vanilla)
   État persistant :
     fm-eleve = {"pseudo":"…"}
     fm-perso = {objectifs:[{id,texte,statut}],
                 outils:[{id,nom,desc,url}],
                 rdvs:[{id,jour,mois,titre,detail}]}
   ============================================================= */
(function () {
  'use strict';

  // ---- État par défaut (identique à la référence) ----
  var state = {
    objectifs: [
      { id: 1, texte: 'Gammes majeures — 2 octaves', statut: 'en_cours' },
      { id: 2, texte: 'Lecture de notes en clé de fa', statut: 'a_travailler' },
      { id: 3, texte: 'Rythmes ternaires', statut: 'maitrise' }
    ],
    outils: [],
    rdvs: [
      { id: 11, jour: '08', mois: 'SEPT', titre: 'Reprise · Solfège', detail: '19h00 · Salle 207' },
      { id: 12, jour: '12', mois: 'SEPT', titre: 'Atelier rythmique', detail: '18h30 · Grand studio' },
      { id: 13, jour: '19', mois: 'SEPT', titre: "Cours d'instrument", detail: 'Sur rendez-vous' }
    ],
    pseudo: '',
    // UI
    addObj: false, addOutil: false, addRep: false, editName: false,
    addMode: 'git', ghChoice: ''
  };
  var uid = 100;

  var GH_CATALOG = [
    { key: 'auberge', nom: 'Auberge espagnole', desc: 'Pique-nique de classe', url: '/auberge-espagnole/', needsUrl: false },
    { key: 'planif', nom: 'Planificateur de répétitions', desc: 'Créneaux communs de répétition', url: '', needsUrl: true }
  ];

  // ---- Persistance ----
  function loadPerso() {
    try {
      var raw = localStorage.getItem('fm-perso');
      if (raw) {
        var d = JSON.parse(raw);
        if (Array.isArray(d.objectifs)) state.objectifs = d.objectifs;
        if (Array.isArray(d.outils)) state.outils = d.outils;
        if (Array.isArray(d.rdvs)) state.rdvs = d.rdvs;
        (d.objectifs || []).concat(d.outils || [], d.rdvs || []).forEach(function (x) {
          if (x && x.id > uid) uid = x.id;
        });
      }
    } catch (e) {}
    try {
      var re = localStorage.getItem('fm-eleve');
      if (re) { state.pseudo = JSON.parse(re).pseudo || ''; }
    } catch (e) {}
  }
  function persistPerso() {
    try {
      localStorage.setItem('fm-perso', JSON.stringify({
        objectifs: state.objectifs, outils: state.outils, rdvs: state.rdvs
      }));
    } catch (e) {}
  }
  function persistEleve() {
    try { localStorage.setItem('fm-eleve', JSON.stringify({ pseudo: state.pseudo })); } catch (e) {}
  }

  // ---- Utilitaires ----
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value : ''; }

  var INP = "font-family:'Work Sans',sans-serif; font-size:14px; padding:11px 14px; border-radius:9px; border:1px solid var(--line,rgba(107,74,46,.16)); background:var(--bg,#efe7d8); color:var(--ink,#2a221b); outline:none;";
  var INP2 = "font-family:'Work Sans',sans-serif; font-size:14px; padding:10px 12px; border-radius:8px; border:1px solid var(--line,rgba(107,74,46,.16)); background:var(--bg,#efe7d8); color:var(--ink,#2a221b); outline:none;";
  var BTN_PRIM = "font-family:'Work Sans',sans-serif; font-weight:600; font-size:13px; color:var(--accInk,#f7f1e6); background:var(--acc,#b3763b); border:none; border-radius:9px; cursor:pointer;";
  var BTN_GHOST = "font-family:'Work Sans',sans-serif; font-size:13px; color:var(--sub,#6b5d4c); background:transparent; border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:9px; cursor:pointer;";

  var STATUT = {
    a_travailler: { label: 'À travailler', bg: 'transparent',        col: 'var(--sub,#6b5d4c)',  bd: 'var(--line,rgba(107,74,46,.16))' },
    en_cours:     { label: 'En cours',     bg: 'var(--panel2,#f0e7d6)', col: 'var(--acc,#b3763b)', bd: 'var(--acc,#b3763b)' },
    maitrise:     { label: 'Maîtrisé',     bg: 'var(--acc,#b3763b)',   col: 'var(--accInk,#f7f1e6)', bd: 'var(--acc,#b3763b)' }
  };
  var PILL = "font-family:'Work Sans',sans-serif; font-weight:500; font-size:12px; letter-spacing:.04em; padding:6px 14px; border-radius:999px; cursor:pointer; white-space:nowrap; flex:none; transition:all .3s ease;";

  // ---- Rendu : date + salutation + nom ----
  function renderHeader() {
    var d = new Date();
    var s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    s = s.charAt(0).toUpperCase() + s.slice(1);
    el('dateLabel').textContent = s;
    el('bonjour').textContent = state.pseudo ? ('Bonjour, ' + state.pseudo + '.') : 'Bonjour !';

    var slot = el('nameSlot');
    var showForm = state.editName || !state.pseudo;
    if (showForm) {
      slot.innerHTML =
        '<div style="display:flex; gap:10px; max-width:380px;">' +
          '<input id="pseudoInput" placeholder="Votre prénom" style="flex:1; min-width:0; ' + INP + '">' +
          '<button id="pseudoSave" style="' + BTN_PRIM + ' padding:0 20px;">C\'est moi</button>' +
        '</div>';
      var inp = el('pseudoInput');
      inp.value = state.pseudo || '';
      el('pseudoSave').onclick = function () {
        var p = inp.value.trim();
        if (!p) return;
        state.pseudo = p; state.editName = false; persistEleve(); renderHeader();
      };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') el('pseudoSave').click(); });
    } else {
      slot.innerHTML =
        '<button id="pseudoEdit" style="background:transparent; border:none; padding:0; cursor:pointer; font-family:\'Work Sans\',sans-serif; font-size:12px; color:var(--sub,#6b5d4c); text-decoration:underline; text-underline-offset:3px;">Ce n\'est pas vous ? Changer de prénom</button>';
      el('pseudoEdit').onclick = function () { state.editName = true; renderHeader(); };
    }
  }

  // ---- Rendu : prochain rendez-vous ----
  function renderNext() {
    var n = state.rdvs[0];
    el('nextTitre').textContent = n ? n.titre : 'Aucun rendez-vous';
    el('nextDetail').textContent = n ? n.detail : 'Proposez une répétition ci-dessous';
  }

  // ---- Rendu : bandeau progression (calculé depuis les objectifs) ----
  function renderProgress() {
    var box = el('progressBanner');
    if (!box) return;
    var objectifs = state.objectifs;
    var tot = objectifs.length;
    var ok = objectifs.filter(function (o) { return o.statut === 'maitrise'; }).length;
    var cours = objectifs.filter(function (o) { return o.statut === 'en_cours'; }).length;
    var trav = tot - ok - cours;
    var pct = tot ? Math.round(ok / tot * 100) + '%' : '0%';

    var left = tot
      ? (ok + ' objectif' + (ok > 1 ? 's' : '') + ' maîtrisé' + (ok > 1 ? 's' : '') + ' sur ' + tot)
      : 'Aucun objectif pour le moment';
    var right = tot ? (cours + ' en cours · ' + trav + ' à travailler') : '';
    var ratio = tot ? (ok + '/' + tot) : '—';

    box.innerHTML =
      '<div style="display:flex; align-items:center; gap:28px;">' +
        '<div style="flex:1; min-width:0;">' +
          '<div style="font-family:\'JetBrains Mono\',monospace; font-size:11px; letter-spacing:.22em; color:var(--acc,#b3763b); text-transform:uppercase; transition:color .5s ease;">Mes objectifs · Progression</div>' +
          '<div style="height:6px; border-radius:999px; background:var(--line,rgba(107,74,46,.16)); overflow:hidden; margin-top:16px;">' +
            '<div style="width:' + pct + '; height:100%; background:linear-gradient(90deg, var(--acc2,#6b4a2e), var(--acc,#b3763b)); border-radius:999px; transition:width .6s ease;"></div>' +
          '</div>' +
          '<div style="display:flex; align-items:baseline; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:10px;">' +
            '<span style="font-family:\'Work Sans\',sans-serif; font-size:13px; color:var(--sub,#6b5d4c); transition:color .5s ease;">' + esc(left) + '</span>' +
            '<span style="font-family:\'Work Sans\',sans-serif; font-size:12px; color:var(--sub,#6b5d4c); transition:color .5s ease;">' + esc(right) + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="font-family:\'Cormorant Garamond\',serif; font-size:42px; color:var(--acc,#b3763b); line-height:1; flex:none; transition:color .5s ease;">' + esc(ratio) + '</div>' +
      '</div>';
  }

  // ---- Rendu : objectifs ----
  function renderObjectifs() {
    var form = el('objForm');
    if (state.addObj) {
      form.innerHTML =
        '<div style="display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap;">' +
          '<input id="objTexte" placeholder="Nouvel objectif (ex : arpèges mineurs)" style="flex:1; min-width:220px; ' + INP + '">' +
          '<button id="objAdd" style="' + BTN_PRIM + ' padding:0 22px;">Ajouter</button>' +
          '<button id="objCancel" style="' + BTN_GHOST + ' padding:0 18px;">Annuler</button>' +
        '</div>';
      el('objAdd').onclick = function () {
        var t = val('objTexte').trim(); if (!t) return;
        state.objectifs.push({ id: ++uid, texte: t, statut: 'a_travailler' });
        state.addObj = false; persistPerso(); renderObjectifs();
      };
      el('objCancel').onclick = function () { state.addObj = false; renderObjectifs(); };
      el('objTexte').addEventListener('keydown', function (e) { if (e.key === 'Enter') el('objAdd').click(); });
      el('objTexte').focus();
    } else {
      form.innerHTML = '';
    }

    var list = el('objList');
    list.innerHTML = state.objectifs.map(function (o) {
      var m = STATUT[o.statut] || STATUT.a_travailler;
      var pill = PILL + 'background:' + m.bg + '; color:' + m.col + '; border:1px solid ' + m.bd + ';';
      return '<div style="display:flex; align-items:center; gap:16px; background:var(--panel,#f7f1e6); border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:10px; padding:15px 18px; margin-bottom:10px; transition:background-color .5s ease,border-color .5s ease;">' +
        '<div style="width:7px; height:7px; border-radius:50%; background:var(--acc,#b3763b); flex:none;"></div>' +
        '<div style="flex:1; font-family:\'Cormorant Garamond\',serif; font-size:19px; color:var(--ink,#2a221b); transition:color .5s ease;">' + esc(o.texte) + '</div>' +
        '<button data-cycle="' + o.id + '" style="' + pill + '">' + m.label + '</button>' +
        '<button data-robj="' + o.id + '" title="Retirer" style="width:26px; height:26px; border-radius:50%; border:1px solid var(--line,rgba(107,74,46,.16)); background:transparent; color:var(--sub,#6b5d4c); cursor:pointer; font-size:14px; line-height:1; flex:none;">×</button>' +
      '</div>';
    }).join('');
    list.querySelectorAll('[data-cycle]').forEach(function (b) {
      b.onclick = function () {
        var id = +b.getAttribute('data-cycle');
        var order = ['a_travailler', 'en_cours', 'maitrise'];
        state.objectifs = state.objectifs.map(function (o) {
          return o.id === id ? Object.assign({}, o, { statut: order[(order.indexOf(o.statut) + 1) % 3] }) : o;
        });
        persistPerso(); renderObjectifs();
      };
    });
    list.querySelectorAll('[data-robj]').forEach(function (b) {
      b.onclick = function () {
        var id = +b.getAttribute('data-robj');
        state.objectifs = state.objectifs.filter(function (o) { return o.id !== id; });
        persistPerso(); renderObjectifs();
      };
    });
    renderProgress();
  }

  // ---- Rendu : outils (cartes ajoutées + tuile d'ajout) ----
  function renderOutils() {
    var slot = el('outilsSlot');
    var theme = (window.getTheme ? window.getTheme() : 'clair');
    var html = state.outils.map(function (u) {
      return '<div style="position:relative; background:var(--panel,#f7f1e6); border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:12px; padding:22px; transition:background-color .5s ease,border-color .5s ease;">' +
        '<button data-rout="' + u.id + '" title="Retirer" style="position:absolute; top:12px; right:12px; width:24px; height:24px; border-radius:50%; border:1px solid var(--line,rgba(107,74,46,.16)); background:transparent; color:var(--sub,#6b5d4c); cursor:pointer; font-size:13px; line-height:1;">×</button>' +
        '<a href="' + esc(u.url || '#') + '" target="_blank" rel="noopener" style="text-decoration:none; display:block;">' +
          '<div style="height:42px; width:42px; border-radius:9px; background:var(--panel2,#f0e7d6); border:1px solid var(--line,rgba(107,74,46,.16)); margin-bottom:16px; display:flex; align-items:center; justify-content:center; color:var(--acc,#b3763b); font-family:\'Cormorant Garamond\',serif; font-size:22px;">♪</div>' +
          '<div style="font-family:\'Cormorant Garamond\',serif; font-size:22px; color:var(--ink,#2a221b); line-height:1;">' + esc(u.nom) + '</div>' +
          '<div style="font-size:13px; color:var(--sub,#6b5d4c); margin:8px 0 0; line-height:1.5;">' + esc(u.desc) + '</div>' +
        '</a>' +
      '</div>';
    }).join('');

    // tuile d'ajout
    html += '<div style="border-radius:12px; border:1px dashed var(--line,rgba(107,74,46,.3)); background:transparent; padding:20px; transition:border-color .5s ease;">';
    if (!state.addOutil) {
      html += '<button id="outilOpen" style="width:100%; height:100%; min-height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; background:transparent; border:none; cursor:pointer; color:var(--acc,#b3763b);">' +
          '<div style="width:40px; height:40px; border-radius:50%; border:1px solid var(--acc,#b3763b); display:flex; align-items:center; justify-content:center; font-size:22px; line-height:1;">＋</div>' +
          '<div style="font-family:\'Work Sans\',sans-serif; font-weight:500; font-size:13px;">Ajouter un outil</div>' +
        '</button>';
    } else {
      var gitOn = state.addMode !== 'url';
      var tabBase = "flex:1; font-family:'Work Sans',sans-serif; font-weight:500; font-size:12px; padding:8px; border-radius:8px; cursor:pointer;";
      var tabOn = tabBase + "background:var(--acc,#b3763b); color:var(--accInk,#f7f1e6); border:1px solid var(--acc,#b3763b);";
      var tabOff = tabBase + "background:transparent; color:var(--sub,#6b5d4c); border:1px solid var(--line,rgba(107,74,46,.16));";
      html += '<div style="display:flex; flex-direction:column; gap:10px;">' +
        '<div style="display:flex; gap:6px;">' +
          '<button id="tabGit" style="' + (gitOn ? tabOn : tabOff) + '">Depuis GitHub</button>' +
          '<button id="tabUrl" style="' + (gitOn ? tabOff : tabOn) + '">Avancé · URL</button>' +
        '</div>';
      if (gitOn) {
        var gcur = GH_CATALOG.filter(function (x) { return x.key === state.ghChoice; })[0];
        html += '<select id="ghSel" style="' + INP2 + '">' +
            '<option value="">Choisir une app…</option>' +
            GH_CATALOG.map(function (g) {
              return '<option value="' + g.key + '"' + (g.key === state.ghChoice ? ' selected' : '') + '>' + esc(g.nom) + '</option>';
            }).join('') +
          '</select>';
        if (gcur && gcur.needsUrl) {
          html += '<input id="ghUrl" placeholder="Lien de déploiement (https://…)" style="' + INP2 + '">';
        }
        html += '<div style="display:flex; gap:8px;">' +
            '<button id="ghAdd" style="flex:1; ' + BTN_PRIM.replace('border-radius:9px', 'border-radius:8px') + ' padding:9px;">Ajouter</button>' +
            '<button id="ghCancel" style="' + BTN_GHOST.replace('border-radius:9px', 'border-radius:8px') + ' padding:9px 14px;">Annuler</button>' +
          '</div>';
      } else {
        html += '<input id="uNom" placeholder="Nom de l\'outil" style="' + INP2 + '">' +
          '<input id="uUrl" placeholder="Lien (https://…)" style="' + INP2 + '">' +
          '<input id="uDesc" placeholder="Description (optionnel)" style="' + INP2 + '">' +
          '<div style="display:flex; gap:8px;">' +
            '<button id="uAdd" style="flex:1; ' + BTN_PRIM.replace('border-radius:9px', 'border-radius:8px') + ' padding:9px;">Ajouter</button>' +
            '<button id="uCancel" style="' + BTN_GHOST.replace('border-radius:9px', 'border-radius:8px') + ' padding:9px 14px;">Annuler</button>' +
          '</div>';
      }
      html += '</div>';
    }
    html += '</div>';

    slot.innerHTML = html;

    // handlers
    slot.querySelectorAll('[data-rout]').forEach(function (b) {
      b.onclick = function (e) {
        e.preventDefault();
        var id = +b.getAttribute('data-rout');
        state.outils = state.outils.filter(function (o) { return o.id !== id; });
        persistPerso(); renderOutils();
      };
    });
    if (el('outilOpen')) el('outilOpen').onclick = function () { state.addOutil = true; renderOutils(); };
    if (el('tabGit')) el('tabGit').onclick = function () { state.addMode = 'git'; renderOutils(); };
    if (el('tabUrl')) el('tabUrl').onclick = function () { state.addMode = 'url'; renderOutils(); };
    if (el('ghSel')) el('ghSel').onchange = function () { state.ghChoice = el('ghSel').value; renderOutils(); };
    if (el('ghCancel')) el('ghCancel').onclick = function () { state.addOutil = false; state.ghChoice = ''; renderOutils(); };
    if (el('uCancel')) el('uCancel').onclick = function () { state.addOutil = false; renderOutils(); };
    if (el('ghAdd')) el('ghAdd').onclick = function () {
      var it = GH_CATALOG.filter(function (x) { return x.key === state.ghChoice; })[0];
      if (!it) return;
      var url;
      if (it.needsUrl) { url = (val('ghUrl') || '').trim(); if (!url) return; }
      else { url = it.url + '?theme=' + theme; }
      state.outils.push({ id: ++uid, nom: it.nom, desc: it.desc, url: url });
      state.addOutil = false; state.ghChoice = ''; persistPerso(); renderOutils();
    };
    if (el('uAdd')) el('uAdd').onclick = function () {
      var n = val('uNom').trim(); if (!n) return;
      state.outils.push({ id: ++uid, nom: n, desc: val('uDesc').trim(), url: val('uUrl').trim() || '#' });
      state.addOutil = false; persistPerso(); renderOutils();
    };
  }

  // ---- Rendu : rendez-vous ----
  function renderRdvs() {
    var form = el('repForm');
    if (state.addRep) {
      form.innerHTML =
        '<div style="background:var(--panel,#f7f1e6); border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:10px; padding:16px; margin-bottom:12px; display:flex; flex-direction:column; gap:9px;">' +
          '<input id="rTitre" value="Répétition" placeholder="Intitulé (ex : Répétition trio)" style="' + INP2 + '">' +
          '<div style="display:flex; gap:9px;">' +
            '<input id="rJour" placeholder="Jour (26)" style="width:80px; ' + INP2 + '">' +
            '<input id="rMois" placeholder="Mois (SEPT)" style="width:110px; ' + INP2 + '">' +
            '<input id="rLieu" placeholder="Heure & lieu" style="flex:1; ' + INP2 + '">' +
          '</div>' +
          '<div style="display:flex; gap:8px;">' +
            '<button id="rAdd" style="flex:1; ' + BTN_PRIM.replace('border-radius:9px', 'border-radius:8px') + ' padding:9px;">Proposer</button>' +
            '<button id="rCancel" style="' + BTN_GHOST.replace('border-radius:9px', 'border-radius:8px') + ' padding:9px 14px;">Annuler</button>' +
          '</div>' +
        '</div>';
      el('rAdd').onclick = function () {
        var t = val('rTitre').trim() || 'Répétition';
        state.rdvs.unshift({
          id: ++uid,
          jour: (val('rJour').trim() || '—'),
          mois: (val('rMois').trim().toUpperCase() || '—'),
          titre: t,
          detail: (val('rLieu').trim() || 'À définir')
        });
        state.addRep = false; persistPerso(); renderRdvs(); renderNext();
      };
      el('rCancel').onclick = function () { state.addRep = false; renderRdvs(); };
    } else {
      form.innerHTML = '';
    }

    var list = el('rdvList');
    list.innerHTML = state.rdvs.map(function (r) {
      return '<div style="position:relative; display:flex; align-items:center; gap:16px; background:var(--panel,#f7f1e6); border:1px solid var(--line,rgba(107,74,46,.16)); border-left:3px solid var(--acc,#b3763b); border-radius:10px; padding:16px 18px; margin-bottom:12px; transition:background-color .5s ease,border-color .5s ease;">' +
        '<div style="text-align:center; min-width:46px;"><div style="font-family:\'Cormorant Garamond\',serif; font-size:26px; color:var(--acc,#b3763b); line-height:1; transition:color .5s ease;">' + esc(r.jour) + '</div><div style="font-family:\'JetBrains Mono\',monospace; font-size:9px; letter-spacing:.15em; color:var(--sub,#6b5d4c);">' + esc(r.mois) + '</div></div>' +
        '<div style="flex:1;"><div style="font-family:\'Cormorant Garamond\',serif; font-size:19px; color:var(--ink,#2a221b); transition:color .5s ease;">' + esc(r.titre) + '</div><div style="font-size:12px; color:var(--sub,#6b5d4c); transition:color .5s ease;">' + esc(r.detail) + '</div></div>' +
        '<button data-rrdv="' + r.id + '" title="Retirer" style="width:24px; height:24px; border-radius:50%; border:1px solid var(--line,rgba(107,74,46,.16)); background:transparent; color:var(--sub,#6b5d4c); cursor:pointer; font-size:13px; line-height:1; flex:none;">×</button>' +
      '</div>';
    }).join('');
    list.querySelectorAll('[data-rrdv]').forEach(function (b) {
      b.onclick = function () {
        var id = +b.getAttribute('data-rrdv');
        state.rdvs = state.rdvs.filter(function (r) { return r.id !== id; });
        persistPerso(); renderRdvs(); renderNext();
      };
    });
  }

  // ---- Boutons d'en-tête de section (exposés globalement) ----
  window.toggleAddObj = function () { state.addObj = !state.addObj; renderObjectifs(); };
  window.toggleAddRep = function () { state.addRep = !state.addRep; renderRdvs(); };

  // ---- Démarrage ----
  function boot() {
    loadPerso();
    renderHeader();
    renderNext();
    renderObjectifs();
    renderOutils();
    renderRdvs();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
