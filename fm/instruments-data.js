/* =============================================================
   PORTAIL FM — Répertoire d'instruments (données partagées)
   -------------------------------------------------------------
   Idée directrice (issue de la classe) :
     • On range les instruments par TESSITURE (grave / médium / aigu),
       comme les voix (basse / ténor-alto / soprano).
     • Dans une tessiture, on regarde ce qui peut être ÉQUIVALENT :
       chaque « rôle » du groove (basse, backbeat, charley…) peut être
       tenu par plusieurs instruments. Le·la musicien·ne CHOISIT.
       Ex. : « je joue le charley à la cloche aiguë OU au reco-reco ».
     • Plutôt que de cantonner un instrument à un style, on décrit sa
       FONCTION ; les styles ne sont que des exemples.

   Exposé en global : window.FM_INSTRUMENTS
   Aucune dépendance, aucun accès réseau — pur JSON descriptif.
   ============================================================= */
(function () {
  'use strict';

  var DATA = {
    /* ---- TESSITURES : l'axe de rangement, calé sur les voix ---- */
    registres: [
      {
        id: 'grave',
        nom: 'Grave',
        voix: 'Basse',
        symbole: '𝄢',
        resume: 'Le socle. Marque la pulsation et les temps forts.',
        exemples: 'grosse caisse, dundunba, surdo, cajón (basse)'
      },
      {
        id: 'medium',
        nom: 'Médium',
        voix: 'Ténor · Alto',
        symbole: '𝄡',
        resume: 'Le remplissage et les réponses, entre grave et aigu.',
        exemples: 'djembé (ton), congas, sangban, toms'
      },
      {
        id: 'aigu',
        nom: 'Aigu',
        voix: 'Soprano',
        symbole: '𝄞',
        resume: 'Ce qui perce et tient le tempo : accents et croches.',
        exemples: 'caisse claire, charley, cloche aiguë, shaker, reco-reco'
      }
    ],

    /* ---- INSTRUMENTS : rangés par registre, avec techniques dispo ----
       « techniques » = les manières d'en jouer qui changent la tessiture
       ou le rôle (un cajón fait la basse ET le backbeat, par exemple). */
    instruments: [
      // GRAVE
      { id: 'grosse-caisse', nom: 'Grosse caisse', registre: 'grave', famille: 'Peaux', techniques: ['pied', 'mailloche'] },
      { id: 'dundunba',      nom: 'Dundunba',      registre: 'grave', famille: 'Peaux', techniques: ['baguette'] },
      { id: 'surdo',         nom: 'Surdo',         registre: 'grave', famille: 'Peaux', techniques: ['mailloche', 'main étouffée'] },
      { id: 'cajon-basse',   nom: 'Cajón (basse)', registre: 'grave', famille: 'Boîte', techniques: ['frappe centre'], parent: 'cajon' },

      // MÉDIUM
      { id: 'djembe',   nom: 'Djembé',  registre: 'medium', famille: 'Peaux', techniques: ['ton', 'slap', 'basse'] },
      { id: 'sangban',  nom: 'Sangban', registre: 'medium', famille: 'Peaux', techniques: ['baguette'] },
      { id: 'congas',   nom: 'Congas',  registre: 'medium', famille: 'Peaux', techniques: ['ton ouvert', 'slap', 'étouffé'] },
      { id: 'tom',      nom: 'Tom',     registre: 'medium', famille: 'Peaux', techniques: ['baguette', 'balai'] },

      // AIGU
      { id: 'caisse-claire', nom: 'Caisse claire', registre: 'aigu', famille: 'Peaux',  techniques: ['frappe', 'rim-shot', 'balai'] },
      { id: 'cajon-claque',  nom: 'Cajón (claqué)',registre: 'aigu', famille: 'Boîte',  techniques: ['frappe arête'], parent: 'cajon' },
      { id: 'charleston',    nom: 'Charley (hi-hat)', registre: 'aigu', famille: 'Métaux', techniques: ['fermé', 'ouvert', 'pied'] },
      { id: 'cloche-aigue',  nom: 'Cloche aiguë',  registre: 'aigu', famille: 'Métaux', techniques: ['baguette'] },
      { id: 'reco-reco',     nom: 'Reco-reco',     registre: 'aigu', famille: 'Métaux', techniques: ['racle'] },
      { id: 'shaker',        nom: 'Shaker',        registre: 'aigu', famille: 'Secoués', techniques: ['va-et-vient'] },
      { id: 'kenkeni',       nom: 'Kenkeni',       registre: 'aigu', famille: 'Peaux',  techniques: ['baguette'] },
      { id: 'claves',        nom: 'Claves',        registre: 'aigu', famille: 'Bois',   techniques: ['frappe'] },
      { id: 'clap',          nom: 'Clap / frappe', registre: 'aigu', famille: 'Corps',  techniques: ['mains'] }
    ],

    /* ---- FONCTIONS : l'axe d'ÉQUIVALENCE ----
       Un rôle dans le groove, sa tessiture, et la liste des options
       (instrument + technique) qui peuvent le tenir. Le·la musicien·ne
       choisit son option ; rien n'est imposé.  C'est ici que vivent les
       équivalences : « cajón (claqué) ≈ caisse claire », « charley ≈
       cloche aiguë ≈ reco-reco ». */
    fonctions: [
      {
        id: 'basse',
        nom: 'Basse / pulsation',
        registre: 'grave',
        voix: 'Basse',
        role: 'Le socle grave qui marque les temps forts.',
        options: [
          { instrument: 'grosse-caisse', technique: 'pied' },
          { instrument: 'dundunba' },
          { instrument: 'surdo' },
          { instrument: 'cajon-basse', technique: 'frappe centre' },
          { instrument: 'djembe', technique: 'basse' }
        ]
      },
      {
        id: 'appel-medium',
        nom: 'Réponse / médium',
        registre: 'medium',
        voix: 'Ténor · Alto',
        role: 'Les réponses et remplissages entre les temps.',
        options: [
          { instrument: 'djembe', technique: 'ton' },
          { instrument: 'congas', technique: 'ton ouvert' },
          { instrument: 'sangban' },
          { instrument: 'tom' }
        ]
      },
      {
        id: 'backbeat',
        nom: 'Backbeat / caisse claire',
        registre: 'aigu',
        voix: 'Soprano',
        role: "L'accent des contretemps (2 & 4). Le « pan » qui répond à la basse.",
        options: [
          { instrument: 'caisse-claire', technique: 'frappe' },
          { instrument: 'cajon-claque', technique: 'frappe arête' },
          { instrument: 'djembe', technique: 'slap' },
          { instrument: 'congas', technique: 'slap' },
          { instrument: 'clap' }
        ]
      },
      {
        id: 'charley',
        nom: 'Charley / croches',
        registre: 'aigu',
        voix: 'Soprano',
        role: 'Le tic-tac régulier qui tient le tempo. Au choix, selon la couleur voulue.',
        options: [
          { instrument: 'charleston', technique: 'fermé' },
          { instrument: 'cloche-aigue' },
          { instrument: 'reco-reco' },
          { instrument: 'shaker' }
        ]
      },
      {
        id: 'timeline',
        nom: 'Cloche / motif clé',
        registre: 'aigu',
        voix: 'Soprano',
        role: 'Le motif répétitif qui sert de repère (timeline, clave).',
        options: [
          { instrument: 'cloche-aigue' },
          { instrument: 'claves' },
          { instrument: 'kenkeni' }
        ]
      }
    ]
  };

  /* ---- Petits index pratiques pour l'UI ---- */
  DATA.instrumentsById = {};
  DATA.instruments.forEach(function (i) { DATA.instrumentsById[i.id] = i; });

  DATA.registresById = {};
  DATA.registres.forEach(function (r) { DATA.registresById[r.id] = r; });

  DATA.instrumentsByRegistre = function (registreId) {
    return DATA.instruments.filter(function (i) { return i.registre === registreId; });
  };

  window.FM_INSTRUMENTS = DATA;
})();
