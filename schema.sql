-- ============================================================
-- PORTAIL FM — Schéma Supabase complet (PostgreSQL)
-- À exécuter dans SQL Editor du projet Supabase.
-- Partie A : socle « Jam Maker + » (repris du dépôt jam-maker-plus, v0.1)
-- Partie B : ajouts Portail / Tableau de bord / Journal / apps (Phase 2)
-- ============================================================


-- ############################################################
-- PARTIE A — JAM MAKER + (v0.1, 2026-07-02) — repris verbatim
-- ############################################################

-- ---------- Types énumérés ----------

create type statut_competence as enum ('apprentissage', 'jouable', 'maitrise');
create type statut_projet as enum ('brouillon', 'recrutement', 'repetition', 'jouable', 'joue');
create type niveau_besoin as enum ('indispensable', 'souhaitable', 'bonus');
create type statut_invitation as enum ('en_attente', 'accepte', 'refuse');
create type verdict_repet as enum ('ca_tient', 'a_retravailler');
create type statut_presence as enum ('confirme', 'peut_etre', 'absent');

-- ---------- Tables ----------

create table membres (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null unique,
  cree_le timestamptz not null default now()
);

create table chansons (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  artiste text,
  tonalite text,
  tempo int,
  structure text,
  lien_reference text,
  cree_par uuid references membres(id),
  cree_le timestamptz not null default now()
);

create table competences (
  id uuid primary key default gen_random_uuid(),
  membre_id uuid not null references membres(id) on delete cascade,
  chanson_id uuid references chansons(id) on delete cascade,
  instrument text not null,
  statut statut_competence not null default 'apprentissage',
  maj_le timestamptz not null default now(),
  unique (membre_id, chanson_id, instrument)
);

create table projets (
  id uuid primary key default gen_random_uuid(),
  chanson_id uuid not null references chansons(id),
  statut statut_projet not null default 'brouillon',
  cree_par uuid references membres(id),
  cree_le timestamptz not null default now()
);

create table slots (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid not null references projets(id) on delete cascade,
  instrument text not null,
  besoin niveau_besoin not null default 'indispensable',
  membre_id uuid references membres(id) on delete set null,
  invitation statut_invitation,
  cree_le timestamptz not null default now()
);

create table partitions (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid not null references projets(id) on delete cascade,
  instrument text not null,
  fichier text not null,
  version int not null default 1,
  uploade_par uuid references membres(id),
  uploade_le timestamptz not null default now()
);

create table repetitions (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid not null references projets(id) on delete cascade,
  date timestamptz not null,
  lieu text,
  notes text
);

create table confirmations (
  id uuid primary key default gen_random_uuid(),
  repetition_id uuid not null references repetitions(id) on delete cascade,
  slot_id uuid not null references slots(id) on delete cascade,
  verdict verdict_repet not null,
  date timestamptz not null default now(),
  unique (repetition_id, slot_id)
);

create table evenements (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  date timestamptz not null,
  lieu text,
  cree_par uuid references membres(id),
  cree_le timestamptz not null default now()
);

create table participations (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references evenements(id) on delete cascade,
  membre_id uuid not null references membres(id) on delete cascade,
  statut statut_presence not null default 'confirme',
  unique (evenement_id, membre_id)
);

create table playlist_items (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references evenements(id) on delete cascade,
  projet_id uuid not null references projets(id) on delete cascade,
  coche boolean not null default false,
  ordre int not null default 0,
  unique (evenement_id, projet_id)
);

-- ---------- Index utiles ----------
create index on competences (membre_id);
create index on competences (chanson_id, instrument);
create index on slots (projet_id);
create index on slots (membre_id) where membre_id is not null;
create index on confirmations (slot_id, date desc);
create index on playlist_items (evenement_id, ordre);

-- ---------- RLS Jam Maker + ----------
alter table membres enable row level security;
alter table chansons enable row level security;
alter table competences enable row level security;
alter table projets enable row level security;
alter table slots enable row level security;
alter table partitions enable row level security;
alter table repetitions enable row level security;
alter table confirmations enable row level security;
alter table evenements enable row level security;
alter table participations enable row level security;
alter table playlist_items enable row level security;

create policy lecture_membres on membres for select to authenticated using (true);
create policy lecture_chansons on chansons for select to authenticated using (true);
create policy lecture_competences on competences for select to authenticated using (true);
create policy lecture_projets on projets for select to authenticated using (true);
create policy lecture_slots on slots for select to authenticated using (true);
create policy lecture_partitions on partitions for select to authenticated using (true);
create policy lecture_repetitions on repetitions for select to authenticated using (true);
create policy lecture_confirmations on confirmations for select to authenticated using (true);
create policy lecture_evenements on evenements for select to authenticated using (true);
create policy lecture_participations on participations for select to authenticated using (true);
create policy lecture_playlist on playlist_items for select to authenticated using (true);

create policy maj_profil on membres for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy maj_competences on competences for all to authenticated
  using (membre_id = auth.uid()) with check (membre_id = auth.uid());

create policy creer_chansons on chansons for insert to authenticated with check (cree_par = auth.uid());
create policy creer_projets on projets for insert to authenticated with check (cree_par = auth.uid());
create policy creer_evenements on evenements for insert to authenticated with check (cree_par = auth.uid());

create policy gerer_slots on slots for all to authenticated
  using (exists (select 1 from projets p where p.id = projet_id and p.cree_par = auth.uid()) or membre_id = auth.uid())
  with check (exists (select 1 from projets p where p.id = projet_id and p.cree_par = auth.uid()) or membre_id = auth.uid());
create policy gerer_repetitions on repetitions for all to authenticated
  using (exists (select 1 from projets p where p.id = projet_id and p.cree_par = auth.uid()))
  with check (exists (select 1 from projets p where p.id = projet_id and p.cree_par = auth.uid()));
create policy maj_projet on projets for update to authenticated
  using (cree_par = auth.uid()) with check (cree_par = auth.uid());

create policy deposer_partitions on partitions for insert to authenticated with check (uploade_par = auth.uid());
create policy confirmer on confirmations for insert to authenticated
  with check (exists (select 1 from slots s where s.id = slot_id and s.membre_id = auth.uid()));

create policy gerer_participation on participations for all to authenticated
  using (membre_id = auth.uid()) with check (membre_id = auth.uid());
create policy gerer_playlist on playlist_items for all to authenticated
  using (exists (select 1 from evenements e where e.id = evenement_id and e.cree_par = auth.uid()))
  with check (exists (select 1 from evenements e where e.id = evenement_id and e.cree_par = auth.uid()));


-- ############################################################
-- PARTIE B — PORTAIL FM (Phase 2 : identité, tableau de bord, journal, apps)
-- ############################################################

-- ---------- Identité ----------
create table profils (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text,
  instrument text,
  updated_at timestamptz not null default now()
);

-- ---------- Portail / Tableau de bord ----------
create table objectifs (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  texte text,
  statut text check (statut in ('a_travailler','en_cours','maitrise')),
  updated_at timestamptz not null default now()
);

create table outils_perso (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nom text,
  url text,
  "desc" text,
  updated_at timestamptz not null default now()
);

create table rendez_vous (
  id uuid primary key default gen_random_uuid(),
  auteur uuid default auth.uid() references auth.users(id) on delete set null,
  jour text,
  mois text,
  titre text,
  detail text,
  updated_at timestamptz not null default now()
);

-- ---------- Journal de classe ----------
create table journal_fiches (
  id uuid primary key default gen_random_uuid(),
  auteur uuid default auth.uid() references auth.users(id) on delete set null,
  date date,
  titre text,
  resume text,
  updated_at timestamptz not null default now()
);

create table journal_items (
  id uuid primary key default gen_random_uuid(),
  fiche_id uuid references journal_fiches(id) on delete cascade,
  type text check (type in ('devoir','annonce','doc','audio')),
  texte text,
  url text,
  epingle_par uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------- Apps (Phase 3 — tables créées dès maintenant) ----------
create table md_morceaux (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titre text,
  json jsonb,
  partage_classe boolean not null default false,
  updated_at timestamptz not null default now()
);

create table ls_partitions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titre text,
  json jsonb,
  partage_classe boolean not null default false,
  updated_at timestamptz not null default now()
);

create table rep_creneaux (
  id uuid primary key default gen_random_uuid(),
  date date,
  heure text,
  updated_at timestamptz not null default now()
);

create table rep_dispos (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creneau_id uuid references rep_creneaux(id) on delete cascade,
  dispo boolean,
  updated_at timestamptz not null default now()
);

-- ---------- Index ----------
create index on objectifs (owner);
create index on outils_perso (owner);
create index on journal_items (fiche_id);
create index on rep_dispos (creneau_id);

-- ---------- RLS Portail ----------
alter table profils enable row level security;
alter table objectifs enable row level security;
alter table outils_perso enable row level security;
alter table rendez_vous enable row level security;
alter table journal_fiches enable row level security;
alter table journal_items enable row level security;
alter table md_morceaux enable row level security;
alter table ls_partitions enable row level security;
alter table rep_creneaux enable row level security;
alter table rep_dispos enable row level security;

-- Profils : pseudos lisibles par la classe (pour afficher les auteurs), écriture = soi
create policy profils_lecture on profils for select to authenticated using (true);
create policy profils_maj on profils for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Données PERSO strictes (owner uniquement) : objectifs, outils_perso, rep_dispos
create policy objectifs_perso on objectifs for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy outils_perso_perso on outils_perso for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy rep_dispos_perso on rep_dispos for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- Données PERSO + partage classe : md_morceaux, ls_partitions
--   lecture : owner OU partage_classe ; écriture : owner
create policy md_lecture on md_morceaux for select to authenticated
  using (owner = auth.uid() or partage_classe);
create policy md_ecriture on md_morceaux for insert to authenticated with check (owner = auth.uid());
create policy md_maj on md_morceaux for update to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy md_suppr on md_morceaux for delete to authenticated using (owner = auth.uid());

create policy ls_lecture on ls_partitions for select to authenticated
  using (owner = auth.uid() or partage_classe);
create policy ls_ecriture on ls_partitions for insert to authenticated with check (owner = auth.uid());
create policy ls_maj on ls_partitions for update to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy ls_suppr on ls_partitions for delete to authenticated using (owner = auth.uid());

-- Données CLASSE : lecture pour tout connecté, écriture pour tout connecté,
--   suppression réservée à l'auteur.
-- journal_fiches
create policy jf_lecture on journal_fiches for select to authenticated using (true);
create policy jf_insert on journal_fiches for insert to authenticated with check (auth.uid() is not null);
create policy jf_update on journal_fiches for update to authenticated using (auth.uid() is not null);
create policy jf_suppr on journal_fiches for delete to authenticated using (auteur = auth.uid());

-- journal_items : suppression réservée à l'auteur de la fiche parente
create policy ji_lecture on journal_items for select to authenticated using (true);
create policy ji_insert on journal_items for insert to authenticated with check (auth.uid() is not null);
create policy ji_update on journal_items for update to authenticated using (auth.uid() is not null);
create policy ji_suppr on journal_items for delete to authenticated
  using (exists (select 1 from journal_fiches f where f.id = fiche_id and f.auteur = auth.uid()));

-- rendez_vous
create policy rv_lecture on rendez_vous for select to authenticated using (true);
create policy rv_insert on rendez_vous for insert to authenticated with check (auth.uid() is not null);
create policy rv_update on rendez_vous for update to authenticated using (auth.uid() is not null);
create policy rv_suppr on rendez_vous for delete to authenticated using (auteur = auth.uid());

-- rep_creneaux (pas de colonne auteur : suppression ouverte aux connectés)
create policy rc_lecture on rep_creneaux for select to authenticated using (true);
create policy rc_insert on rep_creneaux for insert to authenticated with check (auth.uid() is not null);
create policy rc_update on rep_creneaux for update to authenticated using (auth.uid() is not null);
create policy rc_suppr on rep_creneaux for delete to authenticated using (auth.uid() is not null);
