/* =============================================================
   PORTAIL FM — Annuaire (Phase 3 : intégration entre modules)
   -------------------------------------------------------------
   Une seule identité par personne, partagée par toutes les apps.
   Attributs de groupe :
     'md' = contact Magic Drums    'fm' = classe de Formation Musicale
   Règles :
     - les MD parlent aux MD, les FM aux FM (messages cloisonnés,
       RLS côté serveur + onglets côté client) ;
     - on n'invite à une répétition/jam que dans un groupe commun ;
     - une invitation acceptée apparaît dans le tableau de bord
       du destinataire ET de l'expéditeur (via fm/dashboard.js).
   Hors-ligne d'abord : sans FM_CONFIG/réseau, tout reste dans le
   miroir localStorage de fm-sync ('fm-remote:personnes', etc.)
   et se synchronise à la prochaine connexion.
   Ids : uuid directs (tables Phase 3, pas d'overlay sid).
   ============================================================= */
(function () {
  'use strict';

  var GROUPES = { md: 'Magic Drums', fm: 'Formation Musicale' };

  var state = {
    personnes: [],
    invitations: [],
    messages: [],
    moi: null,            // ma fiche personnes (ou null)
    ongletMsg: 'fm',      // groupe affiché dans les messages
    addPers: false, addInv: false,
    info: ''
  };

  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value : ''; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function norm(s) { return String(s || '').trim().toLowerCase(); }
  function pseudoLocal() {
    try { return (JSON.parse(localStorage.getItem('fm-eleve') || '{}').pseudo) || ''; } catch (e) { return ''; }
  }
  function uid() { return (window.fmSync && window.fmSync.user()) ? window.fmSync.user().id : null; }

  var INP = "font-family:'Work Sans',sans-serif; font-size:14px; padding:10px 12px; border-radius:8px; border:1px solid var(--line,rgba(107,74,46,.16)); background:var(--bg,#efe7d8); color:var(--ink,#2a221b); outline:none;";
  var BTN_PRIM = "font-family:'Work Sans',sans-serif; font-weight:600; font-size:13px; color:var(--accInk,#f7f1e6); background:var(--acc,#b3763b); border:none; border-radius:8px; cursor:pointer; padding:9px 16px;";
  var BTN_GHOST = "font-family:'Work Sans',sans-serif; font-size:13px; color:var(--sub,#6b5d4c); background:transparent; border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:8px; cursor:pointer; padding:9px 14px;";
  var CARD = "background:var(--panel,#f7f1e6); border:1px solid var(--line,rgba(107,74,46,.16)); border-radius:10px; transition:background-color .5s ease,border-color .5s ease;";

  function badge(g, on) {
    var lbl = g === 'md' ? 'MD' : 'FM';
    var title = GROUPES[g];
    if (on) return '<span title="' + title + '" style="font-family:\'JetBrains Mono\',monospace; font-size:10px; letter-spacing:.12em; font-weight:600; color:var(--accInk,#f7f1e6); background:var(--acc,#b3763b); border:1px solid var(--acc,#b3763b); border-radius:999px; padding:4px 10px;">' + lbl + '</span>';
    return '<span title="' + title + '" style="font-family:\'JetBrains Mono\',monospace; font-size:10px; letter-spacing:.12em; color:var(--sub,#6b5d4c); background:transparent; border:1px dashed var(--line,rgba(107,74,46,.3)); border-radius:999px; padding:4px 10px; opacity:.55;">' + lbl + '</span>';
  }

  // ---- Mes groupes : depuis ma fiche ; défaut 'fm' (portail de la classe) ----
  function mesGroupes() {
    if (state.moi && Array.isArray(state.moi.groupes) && state.moi.groupes.length) return state.moi.groupes;
    return ['fm'];
  }
  function groupesCommuns(p) {
    var miens = mesGroupes();
    return (Array.isArray(p.groupes) ? p.groupes : []).filter(function (g) { return miens.indexOf(g) !== -1; });
  }

  // ---- Identification de ma fiche + auto-inscription FM ----
  //  connecté : par user_id, sinon par e-mail (rattachement), sinon création.
  //  hors-ligne : par nom == pseudo local.
  async function ensureSelf() {
    var u = window.fmSync && window.fmSync.user();
    if (u) {
      var mine = state.personnes.filter(function (p) { return p.user_id === u.id; })[0];
      if (!mine) mine = state.personnes.filter(function (p) { return p.email && norm(p.email) === norm(u.email); })[0];
      if (!mine) {
        mine = { nom: pseudoLocal() || (u.email || '').split('@')[0], email: u.email || null, groupes: ['fm'], user_id: u.id };
        mine = await window.fmSync.save('personnes', mine);
        state.personnes.push(mine);
      } else {
        var dirty = false;
        if (mine.user_id !== u.id) { mine.user_id = u.id; dirty = true; }
        if (!Array.isArray(mine.groupes)) { mine.groupes = []; dirty = true; }
        if (mine.groupes.indexOf('fm') === -1) { mine.groupes = mine.groupes.concat(['fm']); dirty = true; }
        if (dirty) await window.fmSync.save('personnes', mine);
      }
      state.moi = mine;
    } else {
      var ps = pseudoLocal();
      state.moi = ps ? (state.personnes.filter(function (p) { return norm(p.nom) === norm(ps); })[0] || null) : null;
    }
  }

  // ---- Chargement ----
  async function loadAll() {
    if (!window.fmSync) return;
    try {
      await window.fmSync.ready;
      state.personnes = await window.fmSync.list('personnes');
      await ensureSelf();
      state.invitations = await window.fmSync.list('invitations');
      state.messages = await window.fmSync.list('messages');
      var gs = mesGroupes();
      if (gs.indexOf(state.ongletMsg) === -1) state.ongletMsg = gs[0] || 'fm';
      renderAll();
    } catch (e) {}
  }

  // ============================================================
  // PERSONNES
  // ============================================================
  function renderPersonnes() {
    var zone = el('persZone'); if (!zone) return;
    var u = uid();
    var html = '';

    html += state.personnes
      .slice()
      .sort(function (a, b) { return norm(a.nom) < norm(b.nom) ? -1 : 1; })
      .map(function (p) {
        var moi = state.moi && p.id === state.moi.id;
        var editable = !u || p.cree_par === u || p.user_id === u; // hors-ligne : tolérant, la RLS tranche
        var badges = ['md', 'fm'].map(function (g) {
          var on = Array.isArray(p.groupes) && p.groupes.indexOf(g) !== -1;
          if (editable) return '<button data-tgl="' + esc(p.id) + ':' + g + '" style="background:none; border:none; padding:0; cursor:pointer;">' + badge(g, on) + '</button>';
          return badge(g, on);
        }).join(' ');
        return '<div style="' + CARD + ' display:flex; align-items:center; gap:14px; padding:14px 18px; margin-bottom:10px;">' +
          '<div style="width:38px; height:38px; border-radius:50%; background:var(--panel2,#f0e7d6); border:1px solid var(--line,rgba(107,74,46,.16)); display:flex; align-items:center; justify-content:center; font-family:\'Cormorant Garamond\',serif; font-size:19px; color:var(--acc,#b3763b); flex:none;">' + esc((p.nom || '?').charAt(0).toUpperCase()) + '</div>' +
          '<div style="flex:1; min-width:0;">' +
          '<div style="font-family:\'Cormorant Garamond\',serif; font-size:20px; color:var(--ink,#2a221b);">' + esc(p.nom) + (moi ? ' <span style="font-family:\'Work Sans\',sans-serif; font-size:11px; color:var(--acc,#b3763b);">· c&#39;est vous</span>' : '') + '</div>' +
          '<div style="font-size:12px; color:var(--sub,#6b5d4c);">' + esc([p.instrument, p.email].filter(Boolean).join(' · ') || '—') + '</div>' +
          '</div>' +
          '<div style="display:flex; gap:6px; flex:none;">' + badges + '</div>' +
          (editable && !moi ? '<button data-rpers="' + esc(p.id) + '" title="Retirer" style="width:24px; height:24px; border-radius:50%; border:1px solid var(--line,rgba(107,74,46,.16)); background:transparent; color:var(--sub,#6b5d4c); cursor:pointer; font-size:13px; line-height:1; flex:none;">×</button>' : '') +
          '</div>';
      }).join('');

    if (!state.personnes.length) {
      html += '<div style="font-size:14px; color:var(--sub,#6b5d4c); padding:8px 0 16px;">Personne pour le moment — ajoutez les membres de la classe (FM) et vos contacts Magic Drums (MD).</div>';
    }

    if (state.addPers) {
      html += '<div style="' + CARD + ' padding:16px; display:flex; flex-direction:column; gap:9px; margin-top:6px;">' +
        '<input id="pNom" placeholder="Nom ou prénom" style="' + INP + '">' +
        '<div style="display:flex; gap:9px; flex-wrap:wrap;">' +
        '<input id="pMail" type="email" placeholder="E-mail (relie les apps entre elles)" style="flex:1; min-width:200px; ' + INP + '">' +
        '<input id="pInstr" placeholder="Instrument" style="width:150px; ' + INP + '">' +
        '</div>' +
        '<div style="display:flex; gap:18px; font-size:13px; color:var(--ink,#2a221b); align-items:center; flex-wrap:wrap;">' +
        '<label style="display:flex; gap:7px; align-items:center; cursor:pointer;"><input id="pMd" type="checkbox"> Contact Magic Drums (MD)</label>' +
        '<label style="display:flex; gap:7px; align-items:center; cursor:pointer;"><input id="pFm" type="checkbox" checked> Classe de Formation Musicale (FM)</label>' +
        '</div>' +
        '<div style="display:flex; gap:8px;">' +
        '<button id="pAdd" style="flex:1; ' + BTN_PRIM + '">Ajouter</button>' +
        '<button id="pCancel" style="' + BTN_GHOST + '">Annuler</button>' +
        '</div></div>';
    } else {
      html += '<button id="pOpen" style="' + BTN_GHOST + ' border-radius:999px; color:var(--acc,#b3763b); margin-top:6px;">＋ Ajouter une personne</button>';
    }
    zone.innerHTML = html;

    if (el('pOpen')) el('pOpen').onclick = function () { state.addPers = true; renderPersonnes(); };
    if (el('pCancel')) el('pCancel').onclick = function () { state.addPers = false; renderPersonnes(); };
    if (el('pAdd')) el('pAdd').onclick = async function () {
      var nom = val('pNom').trim(); if (!nom) { el('pNom').focus(); return; }
      var mail = val('pMail').trim();
      var groupes = [];
      if (el('pMd').checked) groupes.push('md');
      if (el('pFm').checked) groupes.push('fm');
      // déduplication : même e-mail (ou même nom sans e-mail) = même personne -> fusion des groupes
      var ex = state.personnes.filter(function (p) {
        return (mail && p.email && norm(p.email) === norm(mail)) || (!mail && norm(p.nom) === norm(nom));
      })[0];
      if (ex) {
        ex.groupes = (ex.groupes || []).concat(groupes.filter(function (g) { return (ex.groupes || []).indexOf(g) === -1; }));
        if (!ex.instrument && val('pInstr').trim()) ex.instrument = val('pInstr').trim();
        await window.fmSync.save('personnes', ex);
      } else {
        var row = await window.fmSync.save('personnes', { nom: nom, email: mail || null, instrument: val('pInstr').trim() || null, groupes: groupes });
        state.personnes.push(row);
      }
      state.addPers = false; renderPersonnes(); renderInvitations();
    };
    zone.querySelectorAll('[data-tgl]').forEach(function (b) {
      b.onclick = async function () {
        var parts = b.getAttribute('data-tgl').split(':'), id = parts[0], g = parts[1];
        var p = state.personnes.filter(function (x) { return String(x.id) === id; })[0]; if (!p) return;
        if (!Array.isArray(p.groupes)) p.groupes = [];
        var i = p.groupes.indexOf(g);
        if (i === -1) p.groupes = p.groupes.concat([g]); else p.groupes = p.groupes.filter(function (x) { return x !== g; });
        await window.fmSync.save('personnes', p);
        renderPersonnes(); renderInvitations(); renderMessages();
      };
    });
    zone.querySelectorAll('[data-rpers]').forEach(function (b) {
      b.onclick = async function () {
        var id = b.getAttribute('data-rpers');
        state.personnes = state.personnes.filter(function (p) { return String(p.id) !== id; });
        await window.fmSync.remove('personnes', id);
        renderPersonnes(); renderInvitations();
      };
    });
  }

  // ============================================================
  // INVITATIONS
  // ============================================================
  function persById(id) { return state.personnes.filter(function (p) { return p.id === id; })[0] || null; }
  function estPourMoi(inv) { return !!(state.moi && inv.pour === state.moi.id); }
  function estDeMoi(inv) {
    var u = uid();
    if (u) return inv.de === u;
    return !estPourMoi(inv); // hors-ligne : si elle n'est pas pour moi, je l'ai envoyée
  }
  function invLigne(inv, actions) {
    var p = persById(inv.pour);
    var qui = estDeMoi(inv) ? ('→ ' + (p ? p.nom : '?')) : ('de ' + (inv.de_nom || '?'));
    var typeLbl = inv.type === 'jam' ? 'JAM' : 'RÉPÉT';
    var st = { proposee: 'En attente', acceptee: 'Acceptée ✓', refusee: 'Refusée' }[inv.statut] || inv.statut;
    return '<div style="' + CARD + ' display:flex; align-items:center; gap:14px; padding:13px 16px; margin-bottom:9px; border-left:3px solid var(--acc,#b3763b);">' +
      '<div style="text-align:center; min-width:42px;"><div style="font-family:\'Cormorant Garamond\',serif; font-size:22px; color:var(--acc,#b3763b); line-height:1;">' + esc(inv.jour || '—') + '</div><div style="font-family:\'JetBrains Mono\',monospace; font-size:9px; letter-spacing:.15em; color:var(--sub,#6b5d4c);">' + esc(inv.mois || '') + '</div></div>' +
      '<div style="flex:1; min-width:0;">' +
      '<div style="font-family:\'Cormorant Garamond\',serif; font-size:18px; color:var(--ink,#2a221b);">' + esc(inv.titre) + ' <span style="font-family:\'JetBrains Mono\',monospace; font-size:9px; letter-spacing:.14em; color:var(--acc,#b3763b);">' + typeLbl + ' · ' + esc((inv.groupe || '').toUpperCase()) + '</span></div>' +
      '<div style="font-size:12px; color:var(--sub,#6b5d4c);">' + esc([qui, inv.detail].filter(Boolean).join(' · ')) + '</div>' +
      '</div>' +
      (actions
        ? '<button data-acc="' + esc(inv.id) + '" style="' + BTN_PRIM + ' padding:7px 14px;">Accepter</button>' +
          '<button data-ref="' + esc(inv.id) + '" style="' + BTN_GHOST + ' padding:7px 12px;">Refuser</button>'
        : '<span style="font-family:\'Work Sans\',sans-serif; font-size:12px; color:' + (inv.statut === 'acceptee' ? 'var(--acc,#b3763b)' : 'var(--sub,#6b5d4c)') + '; flex:none;">' + st + '</span>') +
      '</div>';
  }

  function renderInvitations() {
    var zone = el('invZone'); if (!zone) return;
    var recuesAttente = state.invitations.filter(function (i) { return estPourMoi(i) && i.statut === 'proposee'; });
    var autres = state.invitations.filter(function (i) { return !(estPourMoi(i) && i.statut === 'proposee'); });

    var html = '';
    if (recuesAttente.length) {
      html += '<div style="font-family:\'JetBrains Mono\',monospace; font-size:11px; letter-spacing:.14em; color:var(--acc,#b3763b); margin:0 0 10px;">À RÉPONDRE</div>';
      html += recuesAttente.map(function (i) { return invLigne(i, true); }).join('');
    }
    if (autres.length) {
      html += '<div style="font-family:\'JetBrains Mono\',monospace; font-size:11px; letter-spacing:.14em; color:var(--sub,#6b5d4c); margin:14px 0 10px;">ENVOYÉES &amp; PASSÉES</div>';
      html += autres.map(function (i) { return invLigne(i, false); }).join('');
    }
    if (!state.invitations.length) {
      html += '<div style="font-size:14px; color:var(--sub,#6b5d4c); padding:4px 0 12px;">Aucune invitation. Proposez une répétition ou une jam à quelqu&#39;un de vos groupes.</div>';
    }

    // formulaire d'envoi : uniquement vers les personnes d'un groupe commun
    var cibles = state.personnes.filter(function (p) {
      return (!state.moi || p.id !== state.moi.id) && groupesCommuns(p).length > 0;
    });
    if (state.addInv) {
      html += '<div style="' + CARD + ' padding:16px; display:flex; flex-direction:column; gap:9px; margin-top:8px;">' +
        '<div style="display:flex; gap:9px; flex-wrap:wrap;">' +
        '<select id="iPour" style="flex:1; min-width:170px; ' + INP + '">' +
        '<option value="">Inviter…</option>' +
        cibles.map(function (p) {
          return '<option value="' + esc(p.id) + '">' + esc(p.nom) + ' (' + groupesCommuns(p).map(function (g) { return g.toUpperCase(); }).join('+') + ')</option>';
        }).join('') +
        '</select>' +
        '<select id="iType" style="width:140px; ' + INP + '"><option value="repetition">Répétition</option><option value="jam">Jam</option></select>' +
        '<select id="iGrp" style="width:90px; ' + INP + '">' + mesGroupes().map(function (g) { return '<option value="' + g + '">' + g.toUpperCase() + '</option>'; }).join('') + '</select>' +
        '</div>' +
        '<input id="iTitre" placeholder="Intitulé (ex : Répétition trio)" style="' + INP + '">' +
        '<div style="display:flex; gap:9px;">' +
        '<input id="iJour" placeholder="Jour (26)" style="width:80px; ' + INP + '">' +
        '<input id="iMois" placeholder="Mois (SEPT)" style="width:110px; ' + INP + '">' +
        '<input id="iDetail" placeholder="Heure &amp; lieu" style="flex:1; ' + INP + '">' +
        '</div>' +
        '<div style="display:flex; gap:8px;">' +
        '<button id="iSend" style="flex:1; ' + BTN_PRIM + '">Envoyer l&#39;invitation</button>' +
        '<button id="iCancel" style="' + BTN_GHOST + '">Annuler</button>' +
        '</div>' +
        '<div style="font-size:11px; color:var(--sub,#6b5d4c);">Seules les personnes partageant un de vos groupes sont proposées — les MD parlent aux MD, les FM aux FM.</div>' +
        '</div>';
    } else {
      html += '<button id="iOpen" style="' + BTN_GHOST + ' border-radius:999px; color:var(--acc,#b3763b); margin-top:8px;">＋ Proposer une répétition / jam</button>';
    }
    if (state.info) html += '<div style="font-size:12px; color:var(--acc,#b3763b); margin-top:8px;">' + esc(state.info) + '</div>';
    zone.innerHTML = html;

    if (el('iOpen')) el('iOpen').onclick = function () { state.addInv = true; state.info = ''; renderInvitations(); };
    if (el('iCancel')) el('iCancel').onclick = function () { state.addInv = false; renderInvitations(); };
    if (el('iSend')) el('iSend').onclick = async function () {
      var pid = val('iPour'); if (!pid) { el('iPour').focus(); return; }
      var cible = persById(pid);
      var grp = val('iGrp');
      if (cible && (cible.groupes || []).indexOf(grp) === -1) {
        var cg = groupesCommuns(cible); grp = cg[0] || grp; // repli : premier groupe commun
      }
      var inv = {
        type: val('iType') || 'repetition',
        groupe: grp,
        titre: val('iTitre').trim() || (val('iType') === 'jam' ? 'Jam' : 'Répétition'),
        jour: val('iJour').trim() || null,
        mois: (val('iMois').trim() || '').toUpperCase() || null,
        detail: val('iDetail').trim() || null,
        de_nom: (state.moi && state.moi.nom) || pseudoLocal() || null,
        pour: pid,
        statut: 'proposee'
      };
      var u = uid(); if (u) inv.de = u;
      state.invitations.push(await window.fmSync.save('invitations', inv));
      state.addInv = false;
      state.info = 'Invitation envoyée' + (u ? '.' : ' (enregistrée localement — elle partira à la prochaine connexion).');
      renderInvitations();
    };
    zone.querySelectorAll('[data-acc]').forEach(function (b) {
      b.onclick = function () { repondre(b.getAttribute('data-acc'), 'acceptee'); };
    });
    zone.querySelectorAll('[data-ref]').forEach(function (b) {
      b.onclick = function () { repondre(b.getAttribute('data-ref'), 'refusee'); };
    });
  }

  async function repondre(id, statut) {
    var inv = state.invitations.filter(function (i) { return String(i.id) === id; })[0];
    if (!inv) return;
    inv.statut = statut;
    await window.fmSync.save('invitations', inv);
    state.info = statut === 'acceptee'
      ? "Invitation acceptée — elle apparaît maintenant dans votre tableau de bord (et dans celui de l'expéditeur)."
      : 'Invitation refusée.';
    renderInvitations();
  }

  // ============================================================
  // MESSAGES (cloisonnés par groupe)
  // ============================================================
  function renderMessages() {
    var zone = el('msgZone'); if (!zone) return;
    var gs = mesGroupes();
    if (gs.indexOf(state.ongletMsg) === -1) state.ongletMsg = gs[0] || 'fm';

    var tabs = gs.map(function (g) {
      var on = g === state.ongletMsg;
      var st = "flex:none; font-family:'Work Sans',sans-serif; font-weight:500; font-size:12px; padding:8px 16px; border-radius:999px; cursor:pointer; " +
        (on ? "background:var(--acc,#b3763b); color:var(--accInk,#f7f1e6); border:1px solid var(--acc,#b3763b);"
            : "background:transparent; color:var(--sub,#6b5d4c); border:1px solid var(--line,rgba(107,74,46,.16));");
      return '<button data-tab="' + g + '" style="' + st + '">' + esc(GROUPES[g]) + '</button>';
    }).join('');

    var msgs = state.messages
      .filter(function (m) { return m.groupe === state.ongletMsg; })
      .sort(function (a, b) { return String(a.updated_at || '') < String(b.updated_at || '') ? -1 : 1; })
      .slice(-50);

    var u = uid();
    var corps = msgs.map(function (m) {
      var moi = u && m.auteur === u;
      var quand = '';
      try { quand = new Date(m.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + new Date(m.updated_at).toTimeString().slice(0, 5); } catch (e) {}
      return '<div style="margin-bottom:10px; display:flex; flex-direction:column; align-items:' + (moi ? 'flex-end' : 'flex-start') + ';">' +
        '<div style="font-family:\'JetBrains Mono\',monospace; font-size:9px; letter-spacing:.1em; color:var(--sub,#6b5d4c); margin-bottom:3px;">' + esc((m.pseudo || '?')) + ' · ' + esc(quand) + '</div>' +
        '<div style="max-width:85%; font-size:14px; line-height:1.5; color:' + (moi ? 'var(--accInk,#f7f1e6)' : 'var(--ink,#2a221b)') + '; background:' + (moi ? 'var(--acc,#b3763b)' : 'var(--panel2,#f0e7d6)') + '; border:1px solid ' + (moi ? 'var(--acc,#b3763b)' : 'var(--line,rgba(107,74,46,.16))') + '; border-radius:12px; padding:9px 14px;">' + esc(m.texte) + '</div>' +
        '</div>';
    }).join('') || '<div style="font-size:13px; color:var(--sub,#6b5d4c); padding:12px 0;">Aucun message dans ce groupe pour le moment.</div>';

    zone.innerHTML =
      '<div style="display:flex; gap:8px; align-items:center; margin-bottom:14px;">' + tabs +
      '<span style="flex:1;"></span>' +
      '<button id="msgRefresh" title="Actualiser" style="' + BTN_GHOST + ' border-radius:999px; padding:7px 13px;">↻</button>' +
      '</div>' +
      '<div id="msgList" style="' + CARD + ' padding:18px; max-height:380px; overflow-y:auto;">' + corps + '</div>' +
      '<div style="display:flex; gap:8px; margin-top:10px;">' +
      '<input id="msgInput" placeholder="Message aux ' + (state.ongletMsg === 'md' ? 'Magic Drums' : 'membres FM') + '…" style="flex:1; ' + INP + '">' +
      '<button id="msgSend" style="' + BTN_PRIM + '">Envoyer</button>' +
      '</div>' +
      '<div style="font-size:11px; color:var(--sub,#6b5d4c); margin-top:6px;">Visible uniquement par le groupe ' + esc(GROUPES[state.ongletMsg]) + '.</div>';

    var list = el('msgList'); if (list) list.scrollTop = list.scrollHeight;
    zone.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { state.ongletMsg = b.getAttribute('data-tab'); renderMessages(); };
    });
    el('msgRefresh').onclick = async function () {
      state.messages = await window.fmSync.list('messages'); renderMessages();
    };
    var send = el('msgSend'), inp = el('msgInput');
    send.onclick = async function () {
      var t = (inp.value || '').trim(); if (!t) { inp.focus(); return; }
      var m = { groupe: state.ongletMsg, texte: t, pseudo: (state.moi && state.moi.nom) || pseudoLocal() || null };
      var u2 = uid(); if (u2) m.auteur = u2;
      state.messages.push(await window.fmSync.save('messages', m));
      inp.value = '';
      renderMessages();
    };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') send.onclick(); });
  }

  function renderAll() { renderPersonnes(); renderInvitations(); renderMessages(); }

  // ---- Démarrage ----
  function boot() {
    renderAll();     // rendu immédiat (miroir local)
    loadAll();       // puis rafraîchissement distant
    if (window.fmSync && window.fmSync.onChange) window.fmSync.onChange(function () { loadAll(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
