/* =============================================================
   PORTAIL FM — Configuration Supabase (publique)
   Seule la clé "publishable/anon" figure ici : elle est conçue
   pour être exposée côté client. NE JAMAIS mettre de clé
   service_role / secrète dans ce fichier ni dans le dépôt.
   Supprimez ce fichier (ou window.FM_CONFIG) pour repasser
   l'ensemble du portail en mode 100 % local.
   ============================================================= */
window.FM_CONFIG = {
  supabaseUrl: "https://hifqtzxhmboxbruraiab.supabase.co",
  supabaseAnonKey: "sb_publishable_HdA4ThMx_yDk7212nJ_sIg_J18wCNYK",
  // URL de retour du magic-link (doit figurer dans Auth → URL Configuration)
  redirectTo: "https://nmulongo-sys.github.io/portail-fm/"
};
