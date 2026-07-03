/* =============================================================
   PORTAIL FM — Journal de classe (logique vanilla)
   État persistant :
     fm-journal = {"fiches":[{id, date:"YYYY-MM-DD", titre, auteur,
                    resume,
                    devoirs:[{id,texte,epingle}],
                    annonces:[{id,texte}],
                    liens:[{id,nom,url,type:"doc"|"audio"}]}]}
   Épinglage d'un devoir -> ajoute {id:Date.now(), texte, statut:"a_travailler"}
     dans fm-perso.objectifs (fusion, sans écraser le reste de fm-perso).
   auteur d'une nouvelle fiche = fm-eleve.pseudo (repli « la classe »).
   Aucune couleur en dur : jetons via fm/theme.js.
   ============================================================= */
(function () {
  'use strict';

  // ---- Dates FR (sans lib externe) ----
  var WEEK = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  var WEEK_ABBR = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  function parse(d) {
    var p = String(d || '').split('-');
    return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  }
  function todayISO() {
    var n = new Date();
    var m = ('0' + (n.getMonth() + 1)).slice(-2);
    var j = ('0' + n.getDate()).slice(-2);
    return n.getFullYear() + '-' + m + '-' + j;
  }
  function fmtShort(d) { // « Jeu. 26 juin »
    var x = parse(d);
    return WEEK_ABBR[x.getDay()] + ' ' + x.getDate() + ' ' + MONTHS[x.getMonth()];
  }
  function fmtLong(d) { // « JEUDI 26 JUIN 2026 »
    var x = parse(d);
    return (WEEK[x.getDay()] + ' ' + x.getDate() + ' ' + MONTHS[x.getMonth()] + ' ' + x.getFullYear()).toUpperCase();
  }
  function monthKey(d) { var x = parse(d); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2); }
  function monthLabel(d) { var x = parse(d); return (MONTHS[x.getMonth()] + ' ' + x.getFullYear()).toUpperCase(); } // « JUIN 2026 »

  // ---- Seed (utilisé si la clé fm-journal est absente) ----
  function seed() {
    return {
      fiches: [
        {
          id: 1, date: '2026-06-26', titre: 'Cadences & degrés', auteur: 'la classe',
          resume: "Révision des trois cadences principales (parfaite, plagale, rompue) et repérage des degrés I–IV–V dans les morceaux du répertoire. Petite dictée d'accords à la fin du cours.",
          devoirs: [
            { id: 101, texte: 'Chiffrer les degrés de la grille « standards jazz »', epingle: false },
            { id: 102, texte: 'Rejouer les 3 cadences dans 4 tonalités', epingle: false }
          ],
          annonces: [{ id: 111, texte: "Pas de cours le 3 juillet — reprise le 10." }],
          liens: [
            { id: 121, nom: 'Solfège · Chapitre 12.pdf', url: '#', type: 'doc' },
            { id: 122, nom: 'Cadences — exemple audio', url: '#', type: 'audio' }
          ]
        },
        {
          id: 2, date: '2026-06-19', titre: 'Rythmes ternaires', auteur: 'la classe',
          resume: "Travail du 6/8 et du 9/8 : subdivision, mise en place à deux voix, lecture rythmique frappée. On a comparé binaire et ternaire sur un même thème.",
          devoirs: [{ id: 201, texte: 'Lire la série rythmique 4 en 6/8', epingle: false }],
          annonces: [],
          liens: [{ id: 221, nom: 'Dictées mélodiques · série 4.pdf', url: '#', type: 'doc' }]
        },
        {
          id: 3, date: '2026-06-12', titre: 'Lecture en clé de fa', auteur: 'la classe',
          resume: "Repérage des notes en clé de fa 4e ligne, lecture lente puis à tempo. Astuce des repères (do 3e interligne).",
          devoirs: [{ id: 301, texte: 'Lire 8 mesures en clé de fa chaque jour', epingle: false }],
          annonces: [],
          liens: []
        }
      ]
    };
  }

  // ---- État ----
  var state = {
    fiches: [],
    pseudo: '',
    selectedId: null,
    adding: false,     // formulaire « Nouvelle fiche »
    editResume: false, // édition du compte-rendu de la fiche ouverte
    addKind: null      // 'devoir' | 'annonce' | 'doc' | 'audio'
  };
  var uid = 1000;

  // ============================================================
  // Synchro Supabase optionnelle (overlay via fm-sync)
  //   sid = uuid distant à côté de l'id local. Sans FM_CONFIG : no-op.
  // ============================================================
  function fmUuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16);
    });
  }
  function syncOn() { return !!(window.FM_CONFIG && window.fmSync); }
  function curUid() { return (window.fmSync && window.fmSync.user()) ? window.fmSync.user().id : null; }
  function pushJournal() {
    if (!syncOn()) return;
    try {
      state.fiches.forEach(function (f) {
        if (!f.sid) f.sid = fmUuid();
        window.fmSync.save('journal_fiches', { id: f.sid, date: f.date, titre: f.titre, resume: f.resume });
        (f.devoirs || []).forEach(function (d) {
          if (!d.sid) d.sid = fmUuid();
          var u = curUid();
          window.fmSync.save('journal_items', { id: d.sid, fiche_id: f.sid, type: 'devoir', texte: d.texte, url: null, epingle_par: (d.epingle && u) ? [u] : [] });
        });
        (f.annonces || []).forEach(function (a) {
          if (!a.sid) a.sid = fmUuid();
          window.fmSync.save('journal_items', { id: a.sid, fiche_id: f.sid, type: 'annonce', texte: a.texte, url: null });
        });
        (f.liens || []).forEach(function (l) {
          if (!l.sid) l.sid = fmUuid();
          window.fmSync.save('journal_items', { id: l.sid, fiche_id: f.sid, type: (l.type === 'audio' ? 'audio' : 'doc'), texte: l.nom, url: l.url });
        });
      });
    } catch (e) {}
  }
  async function pullJournal() {
    if (!syncOn()) return;
    try {
      await window.fmSync.ready;
      if (!window.fmSync.isConnected || !window.fmSync.isConnected()) return;
      var fiches = await window.fmSync.list('journal_fiches');
      var items = await window.fmSync.list('journal_items');
      var bySid = {}; state.fiches.forEach(function (f) { if (f.sid) bySid[f.sid] = f; });
      (fiches || []).forEach(function (rf) {
        var f = bySid[rf.id];
        if (!f) { f = { id: ++uid, sid: rf.id, date: rf.date, titre: rf.titre, resume: rf.resume, auteur: 'la classe', devoirs: [], annonces: [], liens: [] }; state.fiches.push(f); bySid[rf.id] = f; }
        else { f.date = rf.date; f.titre = rf.titre; f.resume = rf.resume; }
      });
      var localItem = {};
      state.fiches.forEach(function (f) { (f.devoirs || []).concat(f.annonces || [], f.liens || []).forEach(function (it) { if (it.sid) localItem[it.sid] = it; }); });
      var groups = {}; (items || []).forEach(function (it) { (groups[it.fiche_id] = groups[it.fiche_id] || []).push(it); });
      state.fiches.forEach(function (f) {
        if (!f.sid || !groups[f.sid]) return;
        var dev = [], ann = [], lie = [], u = curUid();
        groups[f.sid].forEach(function (it) {
          if (it.type === 'devoir') { var prev = localItem[it.id]; var pinned = (Array.isArray(it.epingle_par) && u && it.epingle_par.indexOf(u) !== -1) || (prev ? !!prev.epingle : false); dev.push({ id: ++uid, sid: it.id, texte: it.texte, epingle: pinned }); }
          else if (it.type === 'annonce') { ann.push({ id: ++uid, sid: it.id, texte: it.texte }); }
          else { lie.push({ id: ++uid, sid: it.id, nom: it.texte, url: it.url || '#', type: (it.type === 'audio' ? 'audio' : 'doc') }); }
        });
        f.devoirs = dev; f.annonces = ann; f.liens = lie;
      });
      writeJournal();
      if (!state.selectedId) { var sfirst = sortedFiches()[0]; state.selectedId = sfirst ? sfirst.id : null; }
      renderSommaire(); renderFiche();
    } catch (e) {}
  }

  // ---- Persistance ----
  function loadJournal() {
    try {
      var raw = localStorage.getItem('fm-journal');
      var data = raw ? JSON.parse(raw) : seed();
      if (!data || !Array.isArray(data.fiches)) data = seed();
      state.fiches = data.fiches;
      if (!raw) writeJournal(); // écrit le seed localement (sans pousser vers le distant)
    } catch (e) { state.fiches = seed().fiches; }
    // uid au-dessus des ids existants
    state.fiches.forEach(function (f) {
      [f].concat(f.devoirs || [], f.annonces || [], f.liens || []).forEach(function (x) {
        if (x && x.id > uid) uid = x.id;
      });
    });
    try {
      var re = localStorage.getItem('fm-eleve');
      if (re) state.pseudo = JSON.parse(re).pseudo || '';
    } catch (e) {}
  }
  function writeJournal() {
    try { localStorage.setItem('fm-journal', JSON.stringify({ fiches: state.fiches })); } catch (e) {}
  }
  function persistJournal() { writeJournal(); pushJournal(); }
  // Épinglage : fusion dans fm-perso sans écraser les autres clés
  function pinToObjectifs(texte) {
    var perso = {};
    try { var raw = localStorage.getItem('fm-perso'); if (raw) perso = JSON.parse(raw) || {}; } catch (e) {}
    if (!Array.isArray(perso.objectifs)) perso.objectifs = [];
    perso.objectifs.push({ id: Date.now(), texte: texte, statut: 'a_travailler' });
    try { localStorage.setItem('fm-perso', JSON.stringify(perso)); } catch (e) {}
  }

  // ---- Utilitaires ----
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value : ''; }
  function selected() { return state.fiches.filter(function (f) { return f.id === state.selectedId; })[0] || null; }
  function sortedFiches() {
    return state.fiches.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id; });
  }

  var INP = "font-family:'Work Sans',sans-serif; font-size:14px; padding:11px 14px; border-radius:9px; border:1px solid var(--line,rgba(107,74,46,.16)); background:var(--bg,#efe7d8); color:var(--ink,#2a221b); outline:none;";
  var INP2 = "font-family:'Work Sans',sans-serif; font-size:14px; padding:10px 12px; border-radius:8px; border:1px solid var(--line,rgba(107,74,46,.16)); background:var(--bg,#efe7d8); color:var(--ink,#2a221b); outline:none;";
  var BTN_PRIM = "font-family:'Work Sans',sans-serif; font-weight:600; font-size:13px; color:var(--accInk,#f7f1e6); background:var(--acc,#b3763b); border:none; border-radius:8px; cursor:pointer; padding:10px 16px;";
  var BTN_GHOST = "font-family:'Work Sans',sans-serif; font-size:13px; color:var(--sub,#6b5d4c); background:transparent; border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:8px; cursor:pointer; padding:10px 14px;";
  var KICK = "font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.22em; color:var(--acc,#b3763b); text-transform:uppercase;";
  var SECLBL = "font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.2em; color:var(--sub,#6b5d4c); text-transform:uppercase; margin:0 0 12px;";

  // =============================================================
  // SOMMAIRE (colonne gauche)
  // =============================================================
  function renderSommaire() {
    var box = el('sommaire');
    var html = '';

    // Bouton / formulaire « Nouvelle fiche »
    if (state.adding) {
      html += '<div style="background:var(--panel,#f7f1e6); border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:11px; padding:14px; margin-bottom:16px; display:flex; flex-direction:column; gap:9px; transition:background-color .5s ease,border-color .5s ease;">' +
        '<input id="nfDate" type="date" value="' + esc(todayISO()) + '" style="' + INP2 + '">' +
        '<input id="nfTitre" placeholder="Titre du cours" style="' + INP2 + '">' +
        '<div style="display:flex; gap:8px;">' +
        '<button id="nfAdd" style="flex:1; ' + BTN_PRIM + ' padding:9px;">Créer</button>' +
        '<button id="nfCancel" style="' + BTN_GHOST + ' padding:9px 12px;">Annuler</button>' +
        '</div>' +
        '</div>';
    } else {
      html += '<button id="nfOpen" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; font-family:\'Work Sans\',sans-serif; font-weight:600; font-size:13px; color:var(--accInk,#f7f1e6); background:var(--acc,#b3763b); border:none; border-radius:10px; padding:12px; cursor:pointer; margin-bottom:16px; transition:background-color .5s ease;">＋ Nouvelle fiche</button>';
    }

    // Fiches groupées par mois (tri décroissant)
    var list = sortedFiches();
    if (!list.length) {
      html += '<div style="font-family:\'Work Sans\',sans-serif; font-size:13px; color:var(--sub,#6b5d4c); text-align:center; padding:8px 0;">Aucune fiche.</div>';
    } else {
      var curMonth = null;
      list.forEach(function (f) {
        var mk = monthKey(f.date);
        if (mk !== curMonth) {
          curMonth = mk;
          html += '<div style="' + KICK + ' margin:18px 0 10px;">' + esc(monthLabel(f.date)) + '</div>';
        }
        var active = f.id === state.selectedId;
        html += '<button data-fiche="' + f.id + '" style="width:100%; text-align:left; display:block; background:' + (active ? 'var(--panel,#f7f1e6)' : 'transparent') + '; border:1px solid ' + (active ? 'var(--acc,#b3763b)' : 'var(--line,rgba(107,74,46,.16))') + '; border-radius:9px; padding:11px 13px; margin-bottom:8px; cursor:pointer; transition:background-color .3s ease,border-color .3s ease;">' +
          '<div style="font-family:\'JetBrains Mono\',monospace; font-size:10px; letter-spacing:.08em; color:var(--sub,#6b5d4c); margin-bottom:3px;">' + esc(fmtShort(f.date)) + '</div>' +
          '<div style="font-family:\'Cormorant Garamond\',serif; font-size:18px; color:var(--ink,#2a221b); line-height:1.15;">' + esc(f.titre || 'Sans titre') + '</div>' +
          '</button>';
      });
    }

    box.innerHTML = html;

    if (el('nfOpen')) el('nfOpen').onclick = function () { state.adding = true; renderSommaire(); el('nfTitre') && el('nfTitre').focus(); };
    if (el('nfCancel')) el('nfCancel').onclick = function () { state.adding = false; renderSommaire(); };
    if (el('nfAdd')) el('nfAdd').onclick = createFiche;
    if (el('nfTitre')) el('nfTitre').addEventListener('keydown', function (e) { if (e.key === 'Enter') createFiche(); });
    box.querySelectorAll('[data-fiche]').forEach(function (b) {
      b.onclick = function () {
        state.selectedId = +b.getAttribute('data-fiche');
        state.editResume = false; state.addKind = null;
        renderSommaire(); renderFiche();
      };
    });
  }

  function createFiche() {
    var titre = val('nfTitre').trim();
    var date = val('nfDate') || todayISO();
    if (!titre) { el('nfTitre') && el('nfTitre').focus(); return; }
    var f = {
      id: ++uid, date: date, titre: titre,
      auteur: state.pseudo || 'la classe',
      resume: '', devoirs: [], annonces: [], liens: []
    };
    state.fiches.push(f);
    state.selectedId = f.id;
    state.adding = false;
    state.editResume = true; // résumé directement en édition
    state.addKind = null;
    persistJournal();
    renderSommaire(); renderFiche();
  }

  // =============================================================
  // FICHE OUVERTE (colonne droite)
  // =============================================================
  function renderFiche() {
    var zone = el('ficheZone');
    var f = selected();

    if (!f) {
      zone.innerHTML = '<div style="border:1px dashed var(--line,rgba(107,74,46,.35)); border-radius:16px; padding:64px 40px; text-align:center; color:var(--sub,#6b5d4c); font-family:\'Cormorant Garamond\',serif; font-size:22px; transition:border-color .5s ease,color .5s ease;">Aucune fiche pour le moment…</div>';
      return;
    }

    var h = '';
    // Carte avec filigrane portée
    h += '<div style="position:relative; overflow:hidden; border-radius:16px; border:1px solid var(--line,rgba(107,74,46,.16)); background:repeating-linear-gradient(0deg, transparent 0 15px, var(--staff,rgba(107,74,46,.06)) 15px 16px), var(--panel,#f7f1e6); padding:36px 38px; transition:background-color .5s ease,border-color .5s ease;">';

    // En-tête
    h += '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">' +
      '<div>' +
      '<div style="' + KICK + '">' + esc(fmtLong(f.date)) + '</div>' +
      '<h2 style="font-family:\'Cormorant Garamond\',serif; font-weight:600; font-size:28px; color:var(--ink,#2a221b); margin:8px 0 4px; line-height:1.1; transition:color .5s ease;">' + esc(f.titre || 'Sans titre') + '</h2>' +
      '<div style="font-family:\'Work Sans\',sans-serif; font-size:12px; color:var(--sub,#6b5d4c);">Fiche tenue par ' + esc(f.auteur || 'la classe') + '</div>' +
      '</div>' +
      '<button id="ficheDel" title="Supprimer la fiche" style="width:30px; height:30px; flex:none; border-radius:50%; border:1px solid var(--line,rgba(107,74,46,.16)); background:transparent; color:var(--sub,#6b5d4c); cursor:pointer; font-size:15px; line-height:1;">×</button>' +
      '</div>';

    // --- VU AU COURS ---
    h += '<div style="margin-top:26px;">';
    h += '<div style="display:flex; align-items:baseline; gap:12px;"><div style="' + SECLBL + ' margin:0;">Vu au cours</div>';
    if (!state.editResume) {
      h += '<button id="resEdit" style="font-family:\'Work Sans\',sans-serif; font-size:12px; color:var(--acc,#b3763b); background:transparent; border:none; cursor:pointer; text-decoration:underline; text-underline-offset:3px; padding:0;">modifier</button>';
    }
    h += '</div>';
    if (state.editResume) {
      h += '<textarea id="resText" rows="4" placeholder="Ce qui a été vu au cours…" style="width:100%; resize:vertical; margin-top:10px; ' + INP + ' line-height:1.6;">' + esc(f.resume || '') + '</textarea>' +
        '<div style="display:flex; gap:8px; margin-top:10px;">' +
        '<button id="resSave" style="' + BTN_PRIM + '">Enregistrer</button>' +
        '<button id="resCancel" style="' + BTN_GHOST + '">Annuler</button>' +
        '</div>';
    } else {
      h += '<p style="font-family:\'Work Sans\',sans-serif; font-size:14.5px; line-height:1.7; color:' + (f.resume ? 'var(--ink,#2a221b)' : 'var(--sub,#6b5d4c)') + '; margin:10px 0 0; transition:color .5s ease;">' + (f.resume ? esc(f.resume) : '<em>Compte-rendu à compléter.</em>') + '</p>';
    }
    h += '</div>';

    // --- À TRAVAILLER ---
    if (f.devoirs && f.devoirs.length) {
      h += '<div style="margin-top:28px;"><div style="' + SECLBL + '">À travailler</div>';
      f.devoirs.forEach(function (d) {
        h += '<div style="display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid var(--line,rgba(107,74,46,.12));">' +
          '<div style="flex:1; font-family:\'Work Sans\',sans-serif; font-size:14px; color:var(--ink,#2a221b); transition:color .5s ease;">' + esc(d.texte) + '</div>';
        if (d.epingle) {
          h += '<span style="font-family:\'Work Sans\',sans-serif; font-weight:600; font-size:12px; color:var(--accInk,#f7f1e6); background:var(--acc,#b3763b); border-radius:999px; padding:6px 13px; white-space:nowrap;">✓ Dans mes objectifs</span>';
        } else {
          h += '<button data-pin="' + d.id + '" style="font-family:\'Work Sans\',sans-serif; font-weight:500; font-size:12px; color:var(--acc,#b3763b); background:transparent; border:1px solid var(--acc,#b3763b); border-radius:999px; padding:6px 13px; cursor:pointer; white-space:nowrap;">⌖ Épingler en objectif</button>';
        }
        h += '<button data-rmdev="' + d.id + '" title="Retirer" style="width:24px; height:24px; flex:none; border-radius:50%; border:1px solid var(--line,rgba(107,74,46,.16)); background:transparent; color:var(--sub,#6b5d4c); cursor:pointer; font-size:13px; line-height:1;">×</button>' +
          '</div>';
      });
      h += '</div>';
    }

    // --- ANNONCES ---
    if (f.annonces && f.annonces.length) {
      h += '<div style="margin-top:28px;"><div style="' + SECLBL + '">Annonces</div>';
      f.annonces.forEach(function (a) {
        h += '<div style="display:flex; align-items:center; gap:12px; background:var(--panel2,#f0e7d6); border-radius:9px; padding:12px 14px; margin-bottom:8px; transition:background-color .5s ease;">' +
          '<div style="flex:1; font-family:\'Work Sans\',sans-serif; font-size:14px; color:var(--ink,#2a221b); transition:color .5s ease;">' + esc(a.texte) + '</div>' +
          '<button data-rmann="' + a.id + '" title="Retirer" style="width:24px; height:24px; flex:none; border-radius:50%; border:1px solid var(--line,rgba(107,74,46,.16)); background:transparent; color:var(--sub,#6b5d4c); cursor:pointer; font-size:13px; line-height:1;">×</button>' +
          '</div>';
      });
      h += '</div>';
    }

    // --- DOCUMENTS & ENREGISTREMENTS ---
    if (f.liens && f.liens.length) {
      h += '<div style="margin-top:28px;"><div style="' + SECLBL + '">Documents &amp; enregistrements</div>';
      h += '<div style="display:flex; flex-wrap:wrap; gap:9px;">';
      f.liens.forEach(function (l) {
        var icon = l.type === 'audio' ? '♪' : '⤓';
        h += '<span style="display:inline-flex; align-items:center; gap:8px; background:var(--panel2,#f0e7d6); border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:999px; padding:7px 13px; transition:background-color .5s ease,border-color .5s ease;">' +
          '<span style="font-family:\'Cormorant Garamond\',serif; font-size:16px; color:var(--acc,#b3763b);">' + icon + '</span>' +
          '<a href="' + esc(l.url || '#') + '" target="_blank" rel="noopener" style="font-family:\'Work Sans\',sans-serif; font-size:13px; color:var(--ink,#2a221b); text-decoration:none;">' + esc(l.nom) + '</a>' +
          '<button data-rmlien="' + l.id + '" title="Retirer" style="width:18px; height:18px; flex:none; border-radius:50%; border:none; background:transparent; color:var(--sub,#6b5d4c); cursor:pointer; font-size:13px; line-height:1;">×</button>' +
          '</span>';
      });
      h += '</div></div>';
    }

    // --- BARRE D'AJOUT (sous séparateur pointillé) ---
    h += '<div style="margin-top:30px; border-top:1px dashed var(--line,rgba(107,74,46,.3)); padding-top:18px;">';
    if (state.addKind) {
      var isLink = (state.addKind === 'doc' || state.addKind === 'audio');
      var ph = state.addKind === 'devoir' ? 'À travailler pour la prochaine fois…'
        : state.addKind === 'annonce' ? 'Annonce à la classe…'
        : state.addKind === 'doc' ? 'Nom du document' : "Nom de l'enregistrement";
      h += '<div style="display:flex; flex-direction:column; gap:8px;">' +
        '<input id="akText" placeholder="' + esc(ph) + '" style="' + INP2 + '">';
      if (isLink) h += '<input id="akUrl" placeholder="Lien (https://…)" style="' + INP2 + '">';
      h += '<div style="display:flex; gap:8px;">' +
        '<button id="akAdd" style="' + BTN_PRIM + '">Ajouter</button>' +
        '<button id="akCancel" style="' + BTN_GHOST + '">Annuler</button>' +
        '</div></div>';
    } else {
      var mk = "font-family:'Work Sans',sans-serif; font-weight:500; font-size:12.5px; color:var(--acc,#b3763b); background:transparent; border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:999px; padding:8px 14px; cursor:pointer; transition:border-color .5s ease;";
      h += '<div style="display:flex; flex-wrap:wrap; gap:8px;">' +
        '<button data-add="devoir" style="' + mk + '">＋ À travailler</button>' +
        '<button data-add="annonce" style="' + mk + '">＋ Annonce</button>' +
        '<button data-add="doc" style="' + mk + '">＋ Document</button>' +
        '<button data-add="audio" style="' + mk + '">＋ Enregistrement</button>' +
        '</div>';
    }
    h += '</div>';

    h += '</div>'; // fin carte
    zone.innerHTML = h;

    // ---- handlers ----
    el('ficheDel').onclick = function () {
      if (!window.confirm('Supprimer définitivement cette fiche ?')) return;
      state.fiches = state.fiches.filter(function (x) { return x.id !== f.id; });
      var next = sortedFiches()[0];
      state.selectedId = next ? next.id : null;
      state.editResume = false; state.addKind = null;
      persistJournal(); renderSommaire(); renderFiche();
    };

    if (el('resEdit')) el('resEdit').onclick = function () { state.editResume = true; renderFiche(); el('resText') && el('resText').focus(); };
    if (el('resSave')) el('resSave').onclick = function () {
      f.resume = val('resText').trim(); state.editResume = false; persistJournal(); renderFiche();
    };
    if (el('resCancel')) el('resCancel').onclick = function () { state.editResume = false; renderFiche(); };

    zone.querySelectorAll('[data-pin]').forEach(function (b) {
      b.onclick = function () {
        var id = +b.getAttribute('data-pin');
        var d = (f.devoirs || []).filter(function (x) { return x.id === id; })[0];
        if (!d || d.epingle) return;
        pinToObjectifs(d.texte);
        d.epingle = true;
        persistJournal(); renderFiche();
      };
    });
    zone.querySelectorAll('[data-rmdev]').forEach(function (b) {
      b.onclick = function () {
        var id = +b.getAttribute('data-rmdev');
        f.devoirs = f.devoirs.filter(function (x) { return x.id !== id; });
        persistJournal(); renderFiche();
      };
    });
    zone.querySelectorAll('[data-rmann]').forEach(function (b) {
      b.onclick = function () {
        var id = +b.getAttribute('data-rmann');
        f.annonces = f.annonces.filter(function (x) { return x.id !== id; });
        persistJournal(); renderFiche();
      };
    });
    zone.querySelectorAll('[data-rmlien]').forEach(function (b) {
      b.onclick = function () {
        var id = +b.getAttribute('data-rmlien');
        f.liens = f.liens.filter(function (x) { return x.id !== id; });
        persistJournal(); renderFiche();
      };
    });

    zone.querySelectorAll('[data-add]').forEach(function (b) {
      b.onclick = function () { state.addKind = b.getAttribute('data-add'); renderFiche(); el('akText') && el('akText').focus(); };
    });
    if (el('akCancel')) el('akCancel').onclick = function () { state.addKind = null; renderFiche(); };
    if (el('akAdd')) el('akAdd').onclick = function () {
      var t = val('akText').trim(); if (!t) { el('akText').focus(); return; }
      if (state.addKind === 'devoir') f.devoirs.push({ id: ++uid, texte: t, epingle: false });
      else if (state.addKind === 'annonce') f.annonces.push({ id: ++uid, texte: t });
      else f.liens.push({ id: ++uid, nom: t, url: (val('akUrl').trim() || '#'), type: (state.addKind === 'audio' ? 'audio' : 'doc') });
      state.addKind = null;
      persistJournal(); renderFiche();
    };
    if (el('akText')) el('akText').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && state.addKind !== 'doc' && state.addKind !== 'audio') el('akAdd').click();
    });
  }

  // ---- Démarrage ----
  function boot() {
    loadJournal();
    var first = sortedFiches()[0];
    state.selectedId = first ? first.id : null;
    renderSommaire();
    renderFiche();
    pullJournal();
    if (window.fmSync && window.fmSync.onChange) window.fmSync.onChange(function () { pullJournal(); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
