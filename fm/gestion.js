/* =============================================================
   PORTAIL FM — Gestion (Phase 3)
   -------------------------------------------------------------
   Vue d'ensemble de l'intégration entre modules + outils simples :
     - compteurs : personnes (MD / FM / les deux), invitations par
       statut, messages par groupe, fiches de journal ;
     - liste des personnes avec badges modifiables et retrait ;
     - invitations et messages avec suppression ;
     - export JSON de toutes les données visibles.
   Les actions restent soumises à la RLS : on ne supprime à distance
   que ce que ses propres droits permettent (créateur / auteur).
   Hors-ligne d'abord : lit les miroirs locaux de fm-sync.
   ============================================================= */
(function () {
  'use strict';

  var state = { personnes: [], invitations: [], messages: [], fiches: [], objectifs: [], rdvs: [] };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  var BTN_GHOST = "font-family:'Work Sans',sans-serif; font-size:12px; color:var(--sub,#6b5d4c); background:transparent; border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:8px; cursor:pointer; padding:6px 12px;";
  var CARD = "background:var(--panel,#f7f1e6); border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:12px; transition:background-color .5s ease,border-color .5s ease;";

  function has(p, g) { return Array.isArray(p.groupes) && p.groupes.indexOf(g) !== -1; }

  async function loadAll() {
    if (!window.fmSync) return;
    try {
      await window.fmSync.ready;
      state.personnes = await window.fmSync.list('personnes');
      state.invitations = await window.fmSync.list('invitations');
      state.messages = await window.fmSync.list('messages');
    } catch (e) {}
    try { state.fiches = (JSON.parse(localStorage.getItem('fm-journal') || '{}').fiches) || []; } catch (e) { state.fiches = []; }
    try {
      var perso = JSON.parse(localStorage.getItem('fm-perso') || '{}');
      state.objectifs = perso.objectifs || []; state.rdvs = perso.rdvs || [];
    } catch (e) {}
    renderAll();
  }

  // ---- Compteurs ----
  function kpi(label, valeur, detail) {
    return '<div style="' + CARD + ' padding:20px 22px;">' +
      '<div style="font-family:\'JetBrains Mono\',monospace; font-size:10px; letter-spacing:.18em; color:var(--sub,#6b5d4c); text-transform:uppercase;">' + esc(label) + '</div>' +
      '<div style="font-family:\'Cormorant Garamond\',serif; font-size:40px; color:var(--acc,#b3763b); line-height:1.1; margin-top:6px;">' + esc(valeur) + '</div>' +
      (detail ? '<div style="font-size:12px; color:var(--sub,#6b5d4c); margin-top:4px;">' + esc(detail) + '</div>' : '') +
      '</div>';
  }
  function renderKpis() {
    var zone = el('kpiZone'); if (!zone) return;
    var p = state.personnes;
    var md = p.filter(function (x) { return has(x, 'md'); }).length;
    var fm = p.filter(function (x) { return has(x, 'fm'); }).length;
    var deux = p.filter(function (x) { return has(x, 'md') && has(x, 'fm'); }).length;
    var inv = state.invitations;
    var att = inv.filter(function (i) { return i.statut === 'proposee'; }).length;
    var acc = inv.filter(function (i) { return i.statut === 'acceptee'; }).length;
    var ref = inv.filter(function (i) { return i.statut === 'refusee'; }).length;
    var mMd = state.messages.filter(function (m) { return m.groupe === 'md'; }).length;
    var mFm = state.messages.filter(function (m) { return m.groupe === 'fm'; }).length;
    var comptes = p.filter(function (x) { return x.user_id; }).length;
    zone.innerHTML =
      kpi('Personnes', String(p.length), md + ' MD · ' + fm + ' FM · ' + deux + ' les deux') +
      kpi('Comptes reliés', String(comptes), 'fiches rattachées à une connexion') +
      kpi('Invitations', String(inv.length), att + ' en attente · ' + acc + ' acceptées · ' + ref + ' refusées') +
      kpi('Messages', String(state.messages.length), mMd + ' côté MD · ' + mFm + ' côté FM') +
      kpi('Journal', String(state.fiches.length), 'fiches de cours') +
      kpi('Mon tableau de bord', String(state.objectifs.length) + ' obj.', state.rdvs.length + ' rendez-vous personnels');
  }

  // ---- Personnes ----
  function renderPersonnes() {
    var zone = el('gPersZone'); if (!zone) return;
    if (!state.personnes.length) { zone.innerHTML = '<div style="font-size:13px; color:var(--sub,#6b5d4c);">Aucune personne — tout s\'ajoute depuis la page Annuaire.</div>'; return; }
    zone.innerHTML = state.personnes.slice().sort(function (a, b) { return String(a.nom).toLowerCase() < String(b.nom).toLowerCase() ? -1 : 1; }).map(function (p) {
      return '<div style="display:flex; align-items:center; gap:12px; padding:10px 14px; border-bottom:1px solid var(--line,rgba(107,74,46,.16)); font-size:13px;">' +
        '<div style="flex:1; min-width:0; color:var(--ink,#2a221b);"><span style="font-family:\'Cormorant Garamond\',serif; font-size:17px;">' + esc(p.nom) + '</span>' +
        '<span style="color:var(--sub,#6b5d4c);"> ' + esc([p.instrument, p.email].filter(Boolean).join(' · ')) + '</span>' +
        (p.user_id ? ' <span title="Compte relié" style="color:var(--acc,#b3763b);">●</span>' : '') + '</div>' +
        '<button data-g="' + esc(p.id) + ':md" style="' + BTN_GHOST + (has(p, 'md') ? ' color:var(--accInk,#f7f1e6); background:var(--acc,#b3763b); border-color:var(--acc,#b3763b);' : ' opacity:.6;') + '">MD</button>' +
        '<button data-g="' + esc(p.id) + ':fm" style="' + BTN_GHOST + (has(p, 'fm') ? ' color:var(--accInk,#f7f1e6); background:var(--acc,#b3763b); border-color:var(--acc,#b3763b);' : ' opacity:.6;') + '">FM</button>' +
        '<button data-del="' + esc(p.id) + '" title="Retirer" style="' + BTN_GHOST + '">×</button>' +
        '</div>';
    }).join('');
    zone.querySelectorAll('[data-g]').forEach(function (b) {
      b.onclick = async function () {
        var parts = b.getAttribute('data-g').split(':'), id = parts[0], g = parts[1];
        var p = state.personnes.filter(function (x) { return String(x.id) === id; })[0]; if (!p) return;
        if (!Array.isArray(p.groupes)) p.groupes = [];
        p.groupes = has(p, g) ? p.groupes.filter(function (x) { return x !== g; }) : p.groupes.concat([g]);
        await window.fmSync.save('personnes', p);
        renderKpis(); renderPersonnes();
      };
    });
    zone.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = async function () {
        var id = b.getAttribute('data-del');
        state.personnes = state.personnes.filter(function (p) { return String(p.id) !== id; });
        await window.fmSync.remove('personnes', id);
        renderKpis(); renderPersonnes();
      };
    });
  }

  // ---- Invitations ----
  function renderInvitations() {
    var zone = el('gInvZone'); if (!zone) return;
    if (!state.invitations.length) { zone.innerHTML = '<div style="font-size:13px; color:var(--sub,#6b5d4c);">Aucune invitation visible.</div>'; return; }
    var ST = { proposee: 'en attente', acceptee: 'acceptée ✓', refusee: 'refusée' };
    zone.innerHTML = state.invitations.map(function (i) {
      var p = state.personnes.filter(function (x) { return x.id === i.pour; })[0];
      return '<div style="display:flex; align-items:center; gap:12px; padding:10px 14px; border-bottom:1px solid var(--line,rgba(107,74,46,.16)); font-size:13px;">' +
        '<span style="font-family:\'JetBrains Mono\',monospace; font-size:9px; letter-spacing:.12em; color:var(--acc,#b3763b);">' + (i.type === 'jam' ? 'JAM' : 'RÉPÉT') + '·' + esc((i.groupe || '').toUpperCase()) + '</span>' +
        '<div style="flex:1; min-width:0; color:var(--ink,#2a221b);">' + esc(i.titre) +
        '<span style="color:var(--sub,#6b5d4c);"> — ' + esc([(i.de_nom || '?') + ' → ' + (p ? p.nom : '?'), [i.jour, i.mois].filter(Boolean).join(' '), i.detail].filter(Boolean).join(' · ')) + '</span></div>' +
        '<span style="color:var(--sub,#6b5d4c); flex:none;">' + (ST[i.statut] || i.statut) + '</span>' +
        '<button data-idel="' + esc(i.id) + '" title="Supprimer" style="' + BTN_GHOST + '">×</button>' +
        '</div>';
    }).join('');
    zone.querySelectorAll('[data-idel]').forEach(function (b) {
      b.onclick = async function () {
        var id = b.getAttribute('data-idel');
        state.invitations = state.invitations.filter(function (i) { return String(i.id) !== id; });
        await window.fmSync.remove('invitations', id);
        renderKpis(); renderInvitations();
      };
    });
  }

  // ---- Messages ----
  function renderMessages() {
    var zone = el('gMsgZone'); if (!zone) return;
    if (!state.messages.length) { zone.innerHTML = '<div style="font-size:13px; color:var(--sub,#6b5d4c);">Aucun message visible.</div>'; return; }
    zone.innerHTML = state.messages.slice().sort(function (a, b) { return String(a.updated_at || '') < String(b.updated_at || '') ? 1 : -1; }).slice(0, 30).map(function (m) {
      return '<div style="display:flex; align-items:center; gap:12px; padding:9px 14px; border-bottom:1px solid var(--line,rgba(107,74,46,.16)); font-size:13px;">' +
        '<span style="font-family:\'JetBrains Mono\',monospace; font-size:9px; letter-spacing:.12em; color:var(--acc,#b3763b); flex:none;">' + esc((m.groupe || '').toUpperCase()) + '</span>' +
        '<div style="flex:1; min-width:0; color:var(--ink,#2a221b); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><span style="color:var(--sub,#6b5d4c);">' + esc(m.pseudo || '?') + ' :</span> ' + esc(m.texte) + '</div>' +
        '<button data-mdel="' + esc(m.id) + '" title="Supprimer" style="' + BTN_GHOST + '">×</button>' +
        '</div>';
    }).join('');
    zone.querySelectorAll('[data-mdel]').forEach(function (b) {
      b.onclick = async function () {
        var id = b.getAttribute('data-mdel');
        state.messages = state.messages.filter(function (m) { return String(m.id) !== id; });
        await window.fmSync.remove('messages', id);
        renderKpis(); renderMessages();
      };
    });
  }

  // ---- Barre d'outils ----
  function renderOutils() {
    var zone = el('gOutilsZone'); if (!zone) return;
    var connecte = !!(window.fmSync && window.fmSync.isConnected && window.fmSync.isConnected());
    zone.innerHTML =
      '<span style="font-size:12px; color:' + (connecte ? 'var(--acc,#b3763b)' : 'var(--sub,#6b5d4c)') + ';">' + (connecte ? '✓ Synchronisé avec Supabase' : '◌ Hors-ligne — données locales (miroir)') + '</span>' +
      '<span style="flex:1;"></span>' +
      '<button id="gRefresh" style="' + BTN_GHOST + '">↻ Actualiser</button>' +
      '<button id="gExport" style="' + BTN_GHOST + '">⤓ Exporter (JSON)</button>';
    el('gRefresh').onclick = function () { loadAll(); };
    el('gExport').onclick = function () {
      var dump = {
        exporte_le: new Date().toISOString(),
        personnes: state.personnes, invitations: state.invitations,
        messages: state.messages, journal_fiches: state.fiches,
        objectifs: state.objectifs, rendez_vous: state.rdvs
      };
      var blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'portail-fm-export-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    };
  }

  function renderAll() { renderOutils(); renderKpis(); renderPersonnes(); renderInvitations(); renderMessages(); }

  function boot() {
    renderAll();
    loadAll();
    if (window.fmSync && window.fmSync.onChange) window.fmSync.onChange(function () { loadAll(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
