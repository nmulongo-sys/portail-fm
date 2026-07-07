# Portail Formation Musicale — Adultes, Promotion 2023

Site statique (thème clair/sombre, palette bois/cuivre/or) qui sert de hub vers
les applications musicales de la classe, avec un espace élève personnel.

## Structure

```
index.html            — Accueil (héros, outils, prochains cours, partitions)
tableau-de-bord.html  — Espace élève (objectifs, outils, rendez-vous, documents)
instruments.html      — Répertoire d'instruments par tessiture + équivalences
fm/theme.js           — Moteur de thème partagé (clair/sombre, propage ?theme=)
fm/dashboard.js       — Logique du tableau de bord (état + persistance)
fm/instruments-data.js — Données du répertoire (registres, instruments, fonctions)
fm/instruments.js     — Logique du répertoire (vues, choix perso, export JSON)
fm/portal-theme-tokens.css — Jetons de thème officiels (chargeables via ?themeUrl=)
assets/               — logo-academie.png, prof-violon.png
```

## Répertoire d'instruments (`instruments.html`)

Deux façons de regarder le même répertoire :

- **Par tessiture** — les instruments rangés en registres *grave / médium / aigu*,
  calés sur les voix (basse / ténor-alto / soprano).
- **Par rôle** — chaque fonction du groove (basse, backbeat, charley, timeline…)
  et ses instruments **équivalents**. On ne cantonne pas un instrument à un style :
  on décrit sa fonction, et le·la musicien·ne **choisit** son option (ex. le charley
  à la cloche aiguë *ou* au reco-reco). Le choix se mémorise et s'exporte en JSON
  (« ma ligne »), pour travailler seul·e chez soi.

Les données vivent dans `fm/instruments-data.js` (`window.FM_INSTRUMENTS`) et sont
faciles à enrichir (ajouter un instrument, un rôle ou une option d'équivalence).

## Contrats localStorage (partagés avec les apps sous la même origine)

- `fm-theme` : `'clair' | 'sombre'` — écrit à chaque bascule et au chargement.
- `fm-eleve` : `{"pseudo":"…"}` — prénom de l'élève.
- `fm-perso` : `{objectifs, outils, rdvs}` — état persistant du tableau de bord.
- `fm-instruments-choix` : `{ <fonctionId>: {instrument, technique?} }` — l'instrument
  choisi par l'élève pour chaque rôle du groove (répertoire d'instruments).

## Publier sur GitHub Pages

Depuis le dossier `portail-fm/` (un commit initial est déjà présent) :

```bash
gh repo create nmulongo-sys/portail-fm --public --source=. --remote=origin --push
gh api repos/nmulongo-sys/portail-fm/pages -X POST -f 'source[branch]=main' -f 'source[path]=/'
```

Le site sera servi sur `https://nmulongo-sys.github.io/portail-fm/`.

### Liens vers les apps

Les tuiles pointent vers l'origine commune GitHub Pages, en propageant le thème :

- Jam Maker+ → `/jam-maker-plus/?theme=<clair|sombre>`
- Lead Sheet → `/leadsheetproject/?theme=…`
- Magic Drums → `/magic-drums/?theme=…`
- Auberge espagnole (via « Ajouter un outil ») → `/auberge-espagnole/?theme=…`
- Planificateur de répétitions → URL de déploiement saisie par l'élève

Activez aussi GitHub Pages sur les 4 dépôts d'apps (`jam-maker-plus`,
`leadsheetproject`, `magic-drums`, `auberge-espagnole`) et reportez-y le hook de
thème (voir `annexe-theme-hook/` du dossier de mission d'origine).

> Note : ce site est le **portail** uniquement. Le hub s'attend à trouver les
> apps aux chemins ci-dessus sur la même origine ; tant qu'elles ne sont pas
> publiées, les liens renverront un 404 — c'est normal.
