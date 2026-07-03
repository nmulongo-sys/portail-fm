/* =============================================================
   PORTAIL FM — fm-sync : synchronisation optionnelle Supabase
   -------------------------------------------------------------
   RÈGLE D'OR : hors-ligne d'abord. Sans window.FM_CONFIG, sans
   réseau, ou si supabase-js ne charge pas, ce module devient un
   no-op silencieux : les apps continuent sur leur localStorage.

   API publique (window.fmSync) :
     fmSync.ready            -> Promise résolue une fois l'init tentée
     fmSync.user()           -> objet user courant ou null
     fmSync.login(email)     -> envoie un magic-link (Promise)
     fmSync.logout()         -> déconnecte (Promise)
     fmSync.save(table, obj) -> miroir local + upsert distant si connecté
     fmSync.list(table, f)   -> lit local, rafraîchit distant, last-write-wins
     fmSync.onChange(cb)     -> notifié à chaque changement d'auth
   ============================================================= */
(function () {
  'use strict';

  var CDN = 'https://esm.sh/@supabase/supabase-js@2';
  // Tables « perso » : estampillées owner = auth.uid()
  var PERSO = ['objectifs', 'outils_perso', 'md_morceaux', 'ls_partitions', 'rep_dispos'];

  var cfg = (typeof window !== 'undefined' && window.FM_CONFIG) || null;
  var client = null;      // client supabase ou null (mode local)
  var currentUser = null; // user courant ou null
  var listeners = [];

  function nowISO() { return new Date().toISOString(); }
  function mirrorKey(table) { return 'fm-remote:' + table; }

  function readMirror(table) {
    try { return JSON.parse(localStorage.getItem(mirrorKey(table)) || '[]') || []; }
    catch (e) { return []; }
  }
  function writeMirror(table, rows) {
    try { localStorage.setItem(mirrorKey(table), JSON.stringify(rows)); } catch (e) {}
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16);
    });
  }
  function matches(row, filtre) {
    if (!filtre) return true;
    for (var k in filtre) { if (filtre.hasOwnProperty(k) && row[k] !== filtre[k]) return false; }
    return true;
  }
  // Fusion last-write-wins par id sur updated_at
  function mergeLWW(localRows, remoteRows) {
    var byId = {};
    (localRows || []).concat(remoteRows || []).forEach(function (r) {
      if (!r || r.id == null) return;
      var prev = byId[r.id];
      if (!prev || String(r.updated_at || '') >= String(prev.updated_at || '')) byId[r.id] = r;
    });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  }
  function notify() { listeners.forEach(function (cb) { try { cb(currentUser); } catch (e) {} }); }

  // ---- Initialisation paresseuse ----
  var ready = (async function init() {
    if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null; // pas de config -> local
    try {
      var mod = await import(/* @vite-ignore */ CDN);
      client = mod.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      var sess = await client.auth.getSession();
      currentUser = (sess && sess.data && sess.data.session) ? sess.data.session.user : null;
      client.auth.onAuthStateChange(function (_evt, session) {
        currentUser = session ? session.user : null;
        if (currentUser) syncPseudo();
        notify();
      });
      if (currentUser) await syncPseudo();
    } catch (e) {
      client = null; // réseau/CDN KO -> on reste en local
    }
    return client;
  })();

  // ---- Identité : profils.pseudo <-> localStorage['fm-eleve'] (distant prioritaire) ----
  async function syncPseudo() {
    if (!client || !currentUser) return;
    try {
      var r = await client.from('profils').select('pseudo').eq('id', currentUser.id).maybeSingle();
      var remote = r && r.data ? r.data.pseudo : null;
      if (remote) {
        try { localStorage.setItem('fm-eleve', JSON.stringify({ pseudo: remote })); } catch (e) {}
      } else {
        var local = '';
        try { local = (JSON.parse(localStorage.getItem('fm-eleve') || '{}').pseudo) || ''; } catch (e) {}
        await client.from('profils').upsert({ id: currentUser.id, pseudo: local, updated_at: nowISO() });
      }
    } catch (e) {}
  }

  // ---- API ----
  var api = {
    ready: ready,
    user: function () { return currentUser; },
    onChange: function (cb) { if (typeof cb === 'function') listeners.push(cb); },

    login: async function (email) {
      await ready;
      if (!client || !email) return { ok: false, offline: !client };
      try {
        var opts = { email: String(email).trim() };
        opts.options = { emailRedirectTo: (cfg && cfg.redirectTo) || location.href };
        var r = await client.auth.signInWithOtp(opts);
        return { ok: !r.error, error: r.error ? r.error.message : null };
      } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
    },

    logout: async function () {
      await ready;
      if (client) { try { await client.auth.signOut(); } catch (e) {} }
      currentUser = null; notify();
    },

    // Miroir local immédiat + upsert distant si connecté
    save: async function (table, obj) {
      if (!obj || typeof obj !== 'object') return obj;
      if (obj.id == null) obj.id = uuid();
      obj.updated_at = nowISO();
      if (currentUser && PERSO.indexOf(table) !== -1 && obj.owner == null) obj.owner = currentUser.id;
      // miroir local
      var rows = readMirror(table).filter(function (r) { return r.id !== obj.id; });
      rows.push(obj); writeMirror(table, rows);
      // distant
      await ready;
      if (client && currentUser) {
        try { await client.from(table).upsert(obj); } catch (e) {}
      }
      return obj;
    },

    remove: async function (table, id) {
      var rows = readMirror(table).filter(function (r) { return r.id !== id; });
      writeMirror(table, rows);
      await ready;
      if (client && currentUser) { try { await client.from(table).delete().eq('id', id); } catch (e) {} }
    },

    // Lit local, rafraîchit distant si connecté, last-write-wins
    list: async function (table, filtre) {
      var local = readMirror(table).filter(function (r) { return matches(r, filtre); });
      await ready;
      if (!client || !currentUser) return local;
      try {
        var q = client.from(table).select('*');
        if (filtre) { for (var k in filtre) { if (filtre.hasOwnProperty(k)) q = q.eq(k, filtre[k]); } }
        var r = await q;
        if (r.error) return local;
        var merged = mergeLWW(readMirror(table), r.data || []);
        writeMirror(table, merged);
        return merged.filter(function (row) { return matches(row, filtre); });
      } catch (e) { return local; }
    },

    isConnected: function () { return !!(client && currentUser); }
  };

  window.fmSync = api;
})();
