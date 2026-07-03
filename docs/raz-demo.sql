-- ============================================================
-- REMISE À ZÉRO avant tournage des tutos
-- À exécuter dans SQL Editor de Supabase (droits complets).
-- Vide les données de test (faux prénoms « Jean », TEST SYNC, etc.)
-- sans toucher au schéma ni aux comptes Auth.
-- ============================================================

-- Phase 3 : annuaire, invitations, messages
delete from messages;
delete from invitations;
delete from personnes;

-- Tableau de bord : objectifs / outils / rendez-vous de test
delete from objectifs;
delete from outils_perso;
delete from rendez_vous;

-- Journal : fiches et items de test (gardez-les si les fiches d'exemple
-- vous servent de décor pour les vidéos — dans ce cas, commentez ces 2 lignes)
delete from journal_items;
delete from journal_fiches;

-- Pseudos : remet les profils à blanc (le compte Auth reste)
update profils set pseudo = null;

-- ============================================================
-- Et sur CHAQUE appareil de tournage : ouvrir la console du
-- navigateur (F12) sur le portail et coller :
--
--   Object.keys(localStorage).filter(k => k.startsWith('fm-'))
--     .forEach(k => localStorage.removeItem(k));
--   location.reload();
--
-- (efface fm-eleve, fm-perso, fm-journal et les miroirs fm-remote:*)
-- ============================================================
