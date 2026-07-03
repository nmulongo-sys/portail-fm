# Phase 3 — Intégration entre modules

## Ce que ça apporte
- **Annuaire unifié** (`annuaire.html`) : une seule identité par personne, partagée
  par toutes les apps. Attributs de groupe : **MD** (contacts Magic Drums) et
  **FM** (classe de Formation Musicale) — cumulables. Le rattachement inter-apps
  se fait par e-mail ou par compte connecté (magic-link).
- **Invitations répétition / jam** : envoyées depuis l'annuaire, uniquement vers
  une personne d'un groupe commun. **Acceptée → elle apparaît dans le tableau de
  bord** du destinataire ET de l'expéditeur (encadré doré, badge RÉPÉT/JAM). Les
  invitations en attente sont signalées dans le tableau de bord avec un lien.
- **Messages cloisonnés** : les MD parlent aux MD, les FM aux FM. Onglet par
  groupe côté client, **RLS stricte côté serveur** (lecture ET écriture réservées
  aux membres du groupe via `mes_groupes()`).
- **Page Gestion** (`gestion.html`) : compteurs (personnes MD/FM/les deux, comptes
  reliés, invitations par statut, messages par groupe, journal), listes gérables
  (badges cliquables, suppressions), **export JSON**, statut de synchro.
- **Correctif doublons** : les `sid` attribués au push sont maintenant persistés ;
  rattachement par contenu à défaut de `sid` ; les doublons résiduels (ex.
  « Rejouer les 3 cadences… » ×2) sont purgés localement **et** côté Supabase au
  prochain chargement du tableau de bord. Même protection côté journal + épinglage.

## À faire une fois (Supabase)
Exécuter **`schema-phase3.sql`** dans SQL Editor (après `schema.sql`, déjà en place).
Il crée `personnes`, `invitations`, `messages`, la fonction `mes_groupes()` et les RLS.

## Hors-ligne d'abord (inchangé)
Sans connexion, tout fonctionne en local (miroirs `fm-remote:*`) et se synchronise
à la prochaine connexion. Sans `fm-config.js`, comportement 100 % local.

## Fichiers Phase 3
`schema-phase3.sql` · `annuaire.html` + `fm/annuaire.js` · `gestion.html` +
`fm/gestion.js` · `fm/dashboard.js` (invitations + dédup) · `fm/journal.js`
(dédup) · nav mise à jour sur les 5 pages.

Vérifs headless (jsdom) : tableau de bord 8/8 · annuaire 8/8 · gestion 7/7 ·
journal 3/3 · SQL (3 tables, 11 policies, aucune collision de noms).
