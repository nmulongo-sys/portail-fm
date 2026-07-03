/* =============================================================
   PORTAIL FM — Tutoriel interactif & mode simple (accueil)
   Deux aides pour les novices, sans aucune dépendance :

   1. La VISITE GUIDÉE : un projecteur met en lumière chaque zone
      de la page (navigation, cartes, applis…) avec une bulle
      d'explication. Boutons Précédent / Suivant, clavier
      (flèches, Entrée, Échap) et clic sur le voile pour avancer.
      Les zones sont repérées par l'attribut data-tuto="…".

   2. Le MODE SIMPLE « Que voulez-vous réaliser ? » : on choisit
      un objectif concret, puis on est accompagné étape par étape
      jusqu'au bon endroit du portail.

   À la première visite (localStorage fm-tuto-vu absent), une
   petite fenêtre de bienvenue propose les deux aides.
   API publique : window.fmTuto.demarrerVisite() / ouvrirModeSimple()
   ============================================================= */
(function () {
  'use strict';

  var CLE_VU = 'fm-tuto-vu';

  /* ---------- Étapes de la visite guidée ---------- */
  /* cible : valeur de data-tuto sur la page (null = message centré) */
  var ETAPES = [
    {
      cible: null,
      titre: 'Bienvenue sur votre portail !',
      texte: 'Cette petite visite dure une minute et vous montre à quoi sert chaque zone de la page. Utilisez les boutons ci-dessous, les flèches du clavier, ou cliquez n’importe où pour avancer. Échap pour quitter à tout moment.'
    },
    {
      cible: 'nav',
      titre: 'La barre de navigation',
      texte: 'Ces boutons sont présents sur toutes les pages : ils vous ramènent à l’Accueil ou vous emmènent directement vers une autre page. Vous ne pouvez jamais vous perdre.'
    },
    {
      cible: 'carte-tdb',
      titre: 'Le Tableau de bord',
      texte: 'Votre page personnelle : vos objectifs de travail, votre progression et vos prochains rendez-vous. Le meilleur point de départ chaque semaine.'
    },
    {
      cible: 'carte-journal',
      titre: 'Le Journal de classe',
      texte: 'Ce qu’on a vu à chaque cours, les devoirs à faire et les documents partagés. Si vous avez raté une séance, tout est là.'
    },
    {
      cible: 'carte-annuaire',
      titre: 'L’Annuaire',
      texte: 'Les personnes de la classe et les amis musiciens. C’est ici qu’on propose une répétition ou une jam, et qu’on discute en groupe.'
    },
    {
      cible: 'carte-gestion',
      titre: 'La Gestion',
      texte: 'La vue d’ensemble de la classe : inscriptions, invitations, messages. Surtout utile pour l’organisation — mais les curieux sont les bienvenus.'
    },
    {
      cible: 'applis',
      titre: 'Les applis musicales',
      texte: 'Trois outils pour jouer et s’entraîner : Jam Maker+ (monter un morceau à plusieurs), Lead Sheet (grilles d’accords) et Magic Drums (rythmes de percussions). Elles s’ouvrent dans un nouvel onglet.'
    },
    {
      cible: 'theme',
      titre: 'Clair ou sombre ?',
      texte: 'Ce bouton change l’apparence de tout le portail, applis comprises. Votre choix est retenu pour les prochaines visites.'
    },
    {
      cible: 'mode-simple',
      titre: 'Et si vous hésitez…',
      texte: 'Le bouton « Que voulez-vous réaliser ? » vous pose la question simplement et vous guide pas à pas vers le bon endroit. C’est la fin de la visite — bonne musique !'
    }
  ];

  /* ---------- Objectifs du mode simple ---------- */
  /* Chaque objectif : icône, libellé, étapes (textes), action finale. */
  var OBJECTIFS = [
    {
      icone: '♪',
      libelle: 'Voir mes objectifs et ma progression',
      etapes: [
        'Votre progression vit dans le Tableau de bord, votre page personnelle.',
        'Vous y trouverez vos objectifs de travail de la semaine, votre avancement en un coup d’œil et vos prochains rendez-vous.',
        'Cliquez sur le bouton ci-dessous : la page s’ouvre et vous explique le reste.'
      ],
      action: { libelle: 'Ouvrir le Tableau de bord →', href: 'tableau-de-bord.html' }
    },
    {
      icone: '✎',
      libelle: 'Rattraper un cours ou faire mes devoirs',
      etapes: [
        'Tout ce qui s’est passé en cours est noté dans le Journal de classe.',
        'Chaque séance a sa fiche : ce qu’on a vu, les devoirs donnés et les documents partagés.',
        'Repérez la date du cours manqué, lisez la fiche, et vous êtes à jour !'
      ],
      action: { libelle: 'Ouvrir le Journal de classe →', href: 'journal-de-classe.html' }
    },
    {
      icone: '✉',
      libelle: 'Organiser une répétition ou une jam',
      etapes: [
        'Les répétitions et les jams s’organisent depuis l’Annuaire, avec les gens de la classe et les amis percussionnistes.',
        'Choisissez les personnes à inviter, proposez une date : chacun répond à l’invitation.',
        'Vous pouvez ensuite discuter en groupe pour régler les détails.'
      ],
      action: { libelle: 'Ouvrir l’Annuaire →', href: 'annuaire.html' }
    },
    {
      icone: '☷',
      libelle: 'M’entraîner aux rythmes de percussions',
      etapes: [
        'L’appli Magic Drums affiche les rythmes de djembé et de dununs en partition interactive.',
        'Écoutez chaque voix séparément, ralentissez le tempo, puis jouez par-dessus.',
        'L’appli s’ouvre dans un nouvel onglet, déjà réglée à votre thème. Fermez l’onglet pour revenir ici.'
      ],
      action: { libelle: 'Ouvrir Magic Drums →', app: 'magic', href: '/magic-drums/' }
    },
    {
      icone: '♫',
      libelle: 'Lire une grille d’accords ou monter un morceau',
      etapes: [
        'Deux applis vous aident : Lead Sheet pour lire les grilles d’accords et partitions simplifiées, Jam Maker+ pour monter un morceau à plusieurs.',
        'Commencez par Lead Sheet si vous voulez juste lire ou imprimer une partition pour le pupitre.',
        'Passez à Jam Maker+ quand vous organisez qui joue quoi avec d’autres musiciens.'
      ],
      action: { libelle: 'Ouvrir Lead Sheet →', app: 'lead', href: '/leadsheetproject/' }
    },
    {
      icone: '☾',
      libelle: 'Changer l’apparence (mode sombre)',
      etapes: [
        'Le portail existe en deux ambiances : claire (parchemin) et sombre (veillée).',
        'Le bouton en haut à droite de chaque page permet de basculer quand vous voulez ; votre choix est retenu.',
        'Essayez tout de suite avec le bouton ci-dessous — rien d’autre ne change, seulement les couleurs.'
      ],
      action: { libelle: 'Basculer le thème maintenant', onclick: function () { if (window.toggleTheme) window.toggleTheme(); } }
    }
  ];

  /* ---------- Styles injectés (suivent les variables du thème) ---------- */
  var CSS = '' +
    '.tuto-voile{position:fixed;inset:0;z-index:9000;background:rgba(20,14,8,.55);opacity:0;transition:opacity .3s ease;}' +
    '.tuto-voile.tuto-visible{opacity:1;}' +
    '.tuto-spot{position:fixed;z-index:9001;border-radius:16px;pointer-events:none;box-shadow:0 0 0 6000px rgba(20,14,8,.55),0 0 0 3px var(--acc,#b3763b);transition:top .35s ease,left .35s ease,width .35s ease,height .35s ease,opacity .3s ease;}' +
    '.tuto-bulle{position:fixed;z-index:9002;width:min(360px,calc(100vw - 28px));background:var(--panel,#f7f1e6);border:1px solid var(--line,rgba(107,74,46,.16));border-radius:14px;padding:20px 22px;box-shadow:0 18px 48px rgba(0,0,0,.28);font-family:\'Work Sans\',sans-serif;transition:top .35s ease,left .35s ease;}' +
    '.tuto-bulle-etape{font-family:\'JetBrains Mono\',monospace;font-size:10px;letter-spacing:.22em;color:var(--acc,#b3763b);margin-bottom:8px;}' +
    '.tuto-bulle-titre{font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:600;color:var(--ink,#2a221b);line-height:1.15;margin:0 0 8px;}' +
    '.tuto-bulle-texte{font-size:13.5px;line-height:1.65;color:var(--sub,#6b5d4c);margin:0 0 16px;}' +
    '.tuto-points{display:flex;gap:5px;margin-bottom:14px;}' +
    '.tuto-point{width:7px;height:7px;border-radius:50%;background:var(--line,rgba(107,74,46,.25));transition:background-color .25s ease;}' +
    '.tuto-point.tuto-actif{background:var(--acc,#b3763b);}' +
    '.tuto-actions{display:flex;gap:8px;align-items:center;}' +
    '.tuto-btn{font-family:\'Work Sans\',sans-serif;font-weight:500;font-size:12px;letter-spacing:.05em;text-transform:uppercase;border-radius:8px;padding:10px 14px;cursor:pointer;transition:background-color .25s ease,color .25s ease,border-color .25s ease;}' +
    '.tuto-btn-prim{background:var(--acc,#b3763b);color:var(--accInk,#f7f1e6);border:1px solid var(--acc,#b3763b);}' +
    '.tuto-btn-prim:hover{background:var(--acc2,#6b4a2e);border-color:var(--acc2,#6b4a2e);}' +
    '.tuto-btn-sec{background:transparent;color:var(--sub,#6b5d4c);border:1px solid var(--line,rgba(107,74,46,.16));}' +
    '.tuto-btn-sec:hover{color:var(--ink,#2a221b);border-color:var(--acc,#b3763b);}' +
    '.tuto-btn-lien{background:none;border:none;color:var(--sub,#6b5d4c);font-size:12px;text-decoration:underline;cursor:pointer;margin-left:auto;padding:10px 2px;font-family:\'Work Sans\',sans-serif;}' +
    '.tuto-btn-lien:hover{color:var(--ink,#2a221b);}' +
    /* Fenêtre du mode simple + bienvenue */
    '.tuto-modal{position:fixed;inset:0;z-index:9100;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(20,14,8,.55);opacity:0;transition:opacity .3s ease;}' +
    '.tuto-modal.tuto-visible{opacity:1;}' +
    '.tuto-fenetre{width:min(560px,100%);max-height:min(640px,calc(100vh - 36px));overflow:auto;background:var(--panel,#f7f1e6);border:1px solid var(--line,rgba(107,74,46,.16));border-radius:16px;padding:28px 30px;box-shadow:0 22px 60px rgba(0,0,0,.32);font-family:\'Work Sans\',sans-serif;}' +
    '.tuto-fenetre-sur{font-family:\'JetBrains Mono\',monospace;font-size:10px;letter-spacing:.24em;color:var(--acc,#b3763b);margin-bottom:10px;}' +
    '.tuto-fenetre-titre{font-family:\'Cormorant Garamond\',serif;font-size:30px;font-weight:600;color:var(--ink,#2a221b);line-height:1.1;margin:0 0 10px;}' +
    '.tuto-fenetre-texte{font-size:14px;line-height:1.65;color:var(--sub,#6b5d4c);margin:0 0 20px;}' +
    '.tuto-objectifs{display:flex;flex-direction:column;gap:9px;}' +
    '.tuto-objectif{display:flex;align-items:center;gap:14px;text-align:left;width:100%;background:var(--panel2,#f0e7d6);border:1px solid var(--line,rgba(107,74,46,.16));border-radius:11px;padding:13px 16px;cursor:pointer;font-family:\'Work Sans\',sans-serif;font-size:14px;font-weight:500;color:var(--ink,#2a221b);transition:border-color .2s ease,transform .15s ease;}' +
    '.tuto-objectif:hover{border-color:var(--acc,#b3763b);transform:translateX(3px);}' +
    '.tuto-objectif-icone{flex:none;width:38px;height:38px;border-radius:9px;background:var(--panel,#f7f1e6);border:1px solid var(--line,rgba(107,74,46,.16));display:flex;align-items:center;justify-content:center;color:var(--acc,#b3763b);font-family:\'Cormorant Garamond\',serif;font-size:20px;}' +
    '.tuto-objectif-fleche{margin-left:auto;color:var(--acc,#b3763b);font-size:16px;}' +
    '.tuto-etape-num{flex:none;width:44px;height:44px;border-radius:50%;background:var(--acc,#b3763b);color:var(--accInk,#f7f1e6);display:flex;align-items:center;justify-content:center;font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:600;}' +
    '.tuto-etape-corps{display:flex;gap:16px;align-items:flex-start;background:var(--panel2,#f0e7d6);border:1px solid var(--line,rgba(107,74,46,.16));border-radius:12px;padding:18px;margin-bottom:18px;min-height:96px;}' +
    '.tuto-etape-texte{font-size:14.5px;line-height:1.7;color:var(--ink,#2a221b);margin:0;padding-top:8px;}' +
    '@media (max-width:640px){.tuto-bulle{left:14px !important;right:14px;width:auto;bottom:14px;top:auto !important;}.tuto-fenetre{padding:22px 18px;}}';

  /* ---------- Petites aides DOM ---------- */
  function el(tag, className, html) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function racine() { return document.getElementById('root') || document.body; }
  function cible(nom) { return document.querySelector('[data-tuto="' + nom + '"]'); }
  function dejaVu() {
    try { return localStorage.getItem(CLE_VU) === '1'; } catch (e) { return true; }
  }
  function marquerVu() {
    try { localStorage.setItem(CLE_VU, '1'); } catch (e) {}
  }
  function hrefApp(obj) {
    var theme = (window.getTheme ? window.getTheme() : 'clair');
    return obj.href + (obj.app ? '?theme=' + theme : '');
  }

  /* =============================================================
     VISITE GUIDÉE
     ============================================================= */
  var visite = null; // état courant { index, spot, bulle, voile, ... }

  function demarrerVisite() {
    if (visite) return;
    marquerVu();
    fermerModal();

    var voile = el('div', 'tuto-voile');
    var spot = el('div', 'tuto-spot');
    var bulle = el('div', 'tuto-bulle');
    bulle.setAttribute('role', 'dialog');
    bulle.setAttribute('aria-live', 'polite');
    racine().appendChild(voile);
    racine().appendChild(spot);
    racine().appendChild(bulle);

    visite = { index: 0, voile: voile, spot: spot, bulle: bulle };
    voile.addEventListener('click', function () { avancer(1); });
    window.addEventListener('resize', replacerVisite);
    window.addEventListener('scroll', replacerVisite, true);
    document.addEventListener('keydown', clavierVisite);

    requestAnimationFrame(function () { voile.classList.add('tuto-visible'); });
    montrerEtape(0);
  }

  function clavierVisite(e) {
    if (!visite) return;
    if (e.key === 'Escape') { finirVisite(); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); avancer(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); avancer(-1); }
  }

  function avancer(delta) {
    if (!visite) return;
    var suivant = visite.index + delta;
    if (suivant < 0) return;
    if (suivant >= ETAPES.length) { finirVisite(); return; }
    montrerEtape(suivant);
  }

  function montrerEtape(i) {
    visite.index = i;
    var etape = ETAPES[i];
    var b = visite.bulle;

    var points = '';
    for (var p = 0; p < ETAPES.length; p++) {
      points += '<span class="tuto-point' + (p === i ? ' tuto-actif' : '') + '"></span>';
    }
    b.innerHTML =
      '<div class="tuto-bulle-etape">ÉTAPE ' + (i + 1) + ' / ' + ETAPES.length + '</div>' +
      '<h3 class="tuto-bulle-titre">' + etape.titre + '</h3>' +
      '<p class="tuto-bulle-texte">' + etape.texte + '</p>' +
      '<div class="tuto-points">' + points + '</div>' +
      '<div class="tuto-actions">' +
        (i > 0 ? '<button class="tuto-btn tuto-btn-sec" data-role="prec">← Précédent</button>' : '') +
        '<button class="tuto-btn tuto-btn-prim" data-role="suiv">' + (i === ETAPES.length - 1 ? 'Terminer ✓' : 'Suivant →') + '</button>' +
        '<button class="tuto-btn-lien" data-role="quitter">Passer la visite</button>' +
      '</div>';

    var prec = b.querySelector('[data-role="prec"]');
    if (prec) prec.addEventListener('click', function () { avancer(-1); });
    b.querySelector('[data-role="suiv"]').addEventListener('click', function () { avancer(1); });
    b.querySelector('[data-role="quitter"]').addEventListener('click', finirVisite);
    b.querySelector('[data-role="suiv"]').focus();

    var elCible = etape.cible ? cible(etape.cible) : null;
    if (elCible) {
      elCible.scrollIntoView({ block: 'center', behavior: 'smooth' });
      // laisse le défilement se faire avant de placer le projecteur
      setTimeout(replacerVisite, 60);
      setTimeout(replacerVisite, 350);
    } else {
      replacerVisite();
    }
  }

  function replacerVisite() {
    if (!visite) return;
    var etape = ETAPES[visite.index];
    var b = visite.bulle;
    var s = visite.spot;
    var vw = window.innerWidth, vh = window.innerHeight;
    var mobile = vw <= 640;
    var elCible = etape.cible ? cible(etape.cible) : null;

    if (!elCible) {
      // message centré, pas de projecteur
      s.style.opacity = '0';
      visite.voile.style.pointerEvents = 'auto';
      b.style.left = Math.max(14, (vw - b.offsetWidth) / 2) + 'px';
      if (!mobile) b.style.top = Math.max(14, (vh - b.offsetHeight) / 2) + 'px';
      return;
    }

    var r = elCible.getBoundingClientRect();
    var marge = 8;
    s.style.opacity = '1';
    s.style.top = (r.top - marge) + 'px';
    s.style.left = (r.left - marge) + 'px';
    s.style.width = (r.width + marge * 2) + 'px';
    s.style.height = (r.height + marge * 2) + 'px';
    // le voile propre est masqué par l'ombre du projecteur ; on le garde
    // cliquable pour « avancer d'un clic »
    visite.voile.style.pointerEvents = 'auto';

    if (mobile) return; // la bulle est épinglée en bas via le CSS

    var bh = b.offsetHeight, bw = b.offsetWidth;
    var top = r.bottom + marge + 14;
    if (top + bh > vh - 14) top = r.top - marge - bh - 14;
    if (top < 14) top = Math.max(14, (vh - bh) / 2);
    var left = r.left + r.width / 2 - bw / 2;
    left = Math.min(Math.max(14, left), vw - bw - 14);
    b.style.top = top + 'px';
    b.style.left = left + 'px';
  }

  function finirVisite() {
    if (!visite) return;
    var v = visite;
    visite = null;
    window.removeEventListener('resize', replacerVisite);
    window.removeEventListener('scroll', replacerVisite, true);
    document.removeEventListener('keydown', clavierVisite);
    v.voile.classList.remove('tuto-visible');
    v.spot.style.opacity = '0';
    v.bulle.style.opacity = '0';
    setTimeout(function () {
      v.voile.remove(); v.spot.remove(); v.bulle.remove();
    }, 320);
  }

  /* =============================================================
     MODE SIMPLE « Que voulez-vous réaliser ? »
     ============================================================= */
  var modal = null;

  function ouvrirModal(contenu) {
    fermerModal();
    modal = el('div', 'tuto-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    var fen = el('div', 'tuto-fenetre');
    modal.appendChild(fen);
    modal.addEventListener('click', function (e) { if (e.target === modal) fermerModal(); });
    document.addEventListener('keydown', clavierModal);
    racine().appendChild(modal);
    requestAnimationFrame(function () { modal.classList.add('tuto-visible'); });
    contenu(fen);
    return fen;
  }

  function clavierModal(e) {
    if (e.key === 'Escape') fermerModal();
  }

  function fermerModal() {
    if (!modal) return;
    var m = modal;
    modal = null;
    document.removeEventListener('keydown', clavierModal);
    m.classList.remove('tuto-visible');
    setTimeout(function () { m.remove(); }, 320);
  }

  function ouvrirModeSimple() {
    marquerVu();
    ouvrirModal(function (fen) { rendreChoix(fen); });
  }

  function rendreChoix(fen) {
    fen.innerHTML =
      '<div class="tuto-fenetre-sur">MODE SIMPLE · PAS À PAS</div>' +
      '<h3 class="tuto-fenetre-titre">Que voulez-vous réaliser&nbsp;?</h3>' +
      '<p class="tuto-fenetre-texte">Choisissez un objectif : nous vous guidons étape par étape, sans jargon. Vous pouvez fermer cette fenêtre quand vous voulez (Échap).</p>' +
      '<div class="tuto-objectifs"></div>' +
      '<div style="margin-top:18px; display:flex; justify-content:space-between; align-items:center;">' +
        '<button class="tuto-btn-lien" data-role="visite">Préférer la visite guidée ▶</button>' +
        '<button class="tuto-btn tuto-btn-sec" data-role="fermer">Fermer</button>' +
      '</div>';

    var liste = fen.querySelector('.tuto-objectifs');
    OBJECTIFS.forEach(function (obj) {
      var btn = el('button', 'tuto-objectif',
        '<span class="tuto-objectif-icone">' + obj.icone + '</span>' +
        '<span>' + obj.libelle + '</span>' +
        '<span class="tuto-objectif-fleche">→</span>');
      btn.addEventListener('click', function () { rendreEtapes(fen, obj, 0); });
      liste.appendChild(btn);
    });
    fen.querySelector('[data-role="fermer"]').addEventListener('click', fermerModal);
    fen.querySelector('[data-role="visite"]').addEventListener('click', function () {
      fermerModal();
      demarrerVisite();
    });
  }

  function rendreEtapes(fen, obj, i) {
    var derniere = (i === obj.etapes.length - 1);
    var points = '';
    for (var p = 0; p < obj.etapes.length; p++) {
      points += '<span class="tuto-point' + (p === i ? ' tuto-actif' : '') + '"></span>';
    }

    var actionHtml;
    if (derniere) {
      if (obj.action.href) {
        var externe = !!obj.action.app;
        actionHtml = '<a class="tuto-btn tuto-btn-prim" style="text-decoration:none; display:inline-block;" href="' + hrefApp(obj.action) + '"' + (externe ? ' target="_blank" rel="noopener"' : '') + '>' + obj.action.libelle + '</a>';
      } else {
        actionHtml = '<button class="tuto-btn tuto-btn-prim" data-role="agir">' + obj.action.libelle + '</button>';
      }
    } else {
      actionHtml = '<button class="tuto-btn tuto-btn-prim" data-role="suiv">Étape suivante →</button>';
    }

    fen.innerHTML =
      '<div class="tuto-fenetre-sur">' + obj.libelle.toUpperCase() + '</div>' +
      '<h3 class="tuto-fenetre-titre">Étape ' + (i + 1) + ' sur ' + obj.etapes.length + '</h3>' +
      '<div class="tuto-etape-corps">' +
        '<div class="tuto-etape-num">' + (i + 1) + '</div>' +
        '<p class="tuto-etape-texte">' + obj.etapes[i] + '</p>' +
      '</div>' +
      '<div class="tuto-points" style="margin-bottom:18px;">' + points + '</div>' +
      '<div class="tuto-actions">' +
        '<button class="tuto-btn tuto-btn-sec" data-role="prec">' + (i === 0 ? '← Autres objectifs' : '← Précédent') + '</button>' +
        actionHtml +
        '<button class="tuto-btn-lien" data-role="fermer">Fermer</button>' +
      '</div>';

    fen.querySelector('[data-role="prec"]').addEventListener('click', function () {
      if (i === 0) rendreChoix(fen); else rendreEtapes(fen, obj, i - 1);
    });
    var suiv = fen.querySelector('[data-role="suiv"]');
    if (suiv) {
      suiv.addEventListener('click', function () { rendreEtapes(fen, obj, i + 1); });
      suiv.focus();
    }
    var agir = fen.querySelector('[data-role="agir"]');
    if (agir) {
      agir.addEventListener('click', function () {
        obj.action.onclick();
        // petit retour visuel : on laisse la fenêtre ouverte pour voir le changement
      });
    }
    fen.querySelector('[data-role="fermer"]').addEventListener('click', fermerModal);
  }

  /* =============================================================
     BIENVENUE À LA PREMIÈRE VISITE
     ============================================================= */
  function proposerBienvenue() {
    ouvrirModal(function (fen) {
      fen.innerHTML =
        '<div class="tuto-fenetre-sur">PREMIÈRE VISITE</div>' +
        '<h3 class="tuto-fenetre-titre">Bienvenue dans votre espace de classe !</h3>' +
        '<p class="tuto-fenetre-texte">On dirait que c’est votre première fois ici. Voulez-vous un petit coup de main pour découvrir le portail&nbsp;? Impossible de casser quoi que ce soit.</p>' +
        '<div class="tuto-objectifs">' +
          '<button class="tuto-objectif" data-role="visite"><span class="tuto-objectif-icone">▶</span><span><strong>Visite guidée</strong> — une minute pour découvrir chaque zone de la page</span><span class="tuto-objectif-fleche">→</span></button>' +
          '<button class="tuto-objectif" data-role="simple"><span class="tuto-objectif-icone">✔</span><span><strong>Mode simple</strong> — dites-nous ce que vous voulez réaliser, on vous guide pas à pas</span><span class="tuto-objectif-fleche">→</span></button>' +
        '</div>' +
        '<div style="margin-top:18px; text-align:right;">' +
          '<button class="tuto-btn-lien" data-role="seul">Non merci, j’explore par moi-même</button>' +
        '</div>';
      fen.querySelector('[data-role="visite"]').addEventListener('click', function () { fermerModal(); demarrerVisite(); });
      fen.querySelector('[data-role="simple"]').addEventListener('click', function () { fermerModal(); ouvrirModeSimple(); });
      fen.querySelector('[data-role="seul"]').addEventListener('click', function () { marquerVu(); fermerModal(); });
    });
  }

  /* ---------- Amorçage ---------- */
  function init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var btnVisite = document.getElementById('tutoVisite');
    if (btnVisite) btnVisite.addEventListener('click', demarrerVisite);
    var btnSimple = document.getElementById('tutoModeSimple');
    if (btnSimple) btnSimple.addEventListener('click', ouvrirModeSimple);

    if (!dejaVu()) {
      // on marque « vu » au moment où l'utilisateur répond, pas avant,
      // mais on ne re-propose pas plus d'une fois par chargement
      setTimeout(proposerBienvenue, 700);
    }
  }

  window.fmTuto = { demarrerVisite: demarrerVisite, ouvrirModeSimple: ouvrirModeSimple };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
