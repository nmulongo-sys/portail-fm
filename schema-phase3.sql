-- ============================================================
-- PORTAIL FM — Phase 3 : intégration entre modules
-- À exécuter dans SQL Editor du projet Supabase, APRÈS schema.sql.
-- Additif : ne modifie aucune table existante sauf ajout de colonnes.
--
-- Contenu :
--   1. personnes  — annuaire unifié inter-apps (une seule identité
--      par personne, partagée par toutes les apps). Attributs de
--      groupe : 'md' (contacts Magic Drums) et 'fm' (classe de
--      Formation Musicale). Une personne peut être les deux.
--   2. mes_groupes() — helper RLS : groupes de l'utilisateur courant.
--   3. invitations — répétitions & jams ; l'acceptation les fait
--      apparaître dans le tableau de bord du destinataire ET de
--      l'expéditeur. Règle : on n'invite que dans un groupe commun.
--   4. messages — cloisonnés par groupe : les MD parlent aux MD,
--      les FM aux FM (RLS stricte, pas seulement côté client).
-- ============================================================

-- ---------- 1. Annuaire unifié ----------
create table personnes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  nom text not null,
  email text,
  instrument text,
  groupes text[] not null default '{}',           -- valeurs : 'md', 'fm'
  cree_par uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
-- Une même adresse e-mail = une même personne (dédoublonnage inter-apps)
create unique index personnes_email_uniq on personnes (lower(email)) where email is not null;
create index personnes_groupes_idx on personnes using gin (groupes);

-- ---------- 2. Helper RLS : groupes de l'utilisateur courant ----------
-- security definer : contourne la RLS de personnes pour lire SA propre ligne.
create or replace function mes_groupes() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce((select groupes from personnes where user_id = auth.uid()), '{}'::text[]);
$$;

-- ---------- 3. Invitations (répétitions & jams) ----------
create table invitations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('repetition','jam')),
  groupe text not null check (groupe in ('md','fm')),
  titre text not null,
  jour text,                                       -- ex : '26'
  mois text,                                       -- ex : 'SEPT'
  detail text,                                     -- ex : '19h00 · Salle 207'
  de uuid not null default auth.uid() references auth.users(id) on delete cascade,
  de_nom text,                                     -- pseudo de l'expéditeur (affichage)
  pour uuid not null references personnes(id) on delete cascade,
  statut text not null default 'proposee' check (statut in ('proposee','acceptee','refusee')),
  updated_at timestamptz not null default now()
);
create index invitations_pour_idx on invitations (pour);
create index invitations_de_idx on invitations (de);

-- ---------- 4. Messages de groupe ----------
create table messages (
  id uuid primary key default gen_random_uuid(),
  groupe text not null check (groupe in ('md','fm')),
  auteur uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pseudo text,                                     -- nom affiché de l'auteur
  texte text not null,
  updated_at timestamptz not null default now()
);
create index messages_groupe_idx on messages (groupe, updated_at desc);

-- ---------- RLS ----------
alter table personnes enable row level security;
alter table invitations enable row level security;
alter table messages enable row level security;

-- personnes : annuaire lisible par tout connecté (afficher noms/badges) ;
-- création par tout connecté ; modification par le créateur ou la personne
-- elle-même (sa propre fiche) ; suppression par le créateur.
create policy pers_lecture on personnes for select to authenticated using (true);
create policy pers_insert on personnes for insert to authenticated
  with check (cree_par = auth.uid());
create policy pers_update on personnes for update to authenticated
  using (cree_par = auth.uid() or user_id = auth.uid())
  with check (cree_par = auth.uid() or user_id = auth.uid());
create policy pers_suppr on personnes for delete to authenticated
  using (cree_par = auth.uid());

-- invitations : visibles par l'expéditeur et le destinataire uniquement.
-- Envoi : il faut partager le groupe avec le destinataire (MD→MD, FM→FM).
-- Réponse (accepter/refuser) : destinataire uniquement.
-- Suppression : expéditeur.
create policy inv_lecture on invitations for select to authenticated
  using (de = auth.uid()
         or exists (select 1 from personnes p where p.id = pour and p.user_id = auth.uid()));
create policy inv_insert on invitations for insert to authenticated
  with check (de = auth.uid()
              and groupe = any (mes_groupes())
              and exists (select 1 from personnes p where p.id = pour and groupe = any (p.groupes)));
create policy inv_update on invitations for update to authenticated
  using (exists (select 1 from personnes p where p.id = pour and p.user_id = auth.uid()))
  with check (exists (select 1 from personnes p where p.id = pour and p.user_id = auth.uid()));
create policy inv_suppr on invitations for delete to authenticated
  using (de = auth.uid());

-- messages : cloisonnement strict par groupe. Lecture ET écriture
-- réservées aux membres du groupe. Suppression : auteur.
create policy msg_lecture on messages for select to authenticated
  using (groupe = any (mes_groupes()));
create policy msg_insert on messages for insert to authenticated
  with check (auteur = auth.uid() and groupe = any (mes_groupes()));
create policy msg_suppr on messages for delete to authenticated
  using (auteur = auth.uid());
