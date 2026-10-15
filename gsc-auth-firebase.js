/* gsc-auth-firebase.js — remplace le client Supabase par Firebase Auth.
   Même interface : window.supabase.createClient(...).auth.* ; uid = uid Firebase. */
(function () {
  'use strict';
  var FB_AUTH_URL = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
  var _impl = null, _implP = null, _first = null;
  var _subs = [], _listenerOn = false, _cur = null, _last = undefined, _initDone = false;

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function mkErr(e) {
    var c = (e && e.code) || '', m = (e && e.message) || String(e), status = 400;
    if (c === 'auth/email-already-in-use') m = 'User already registered';
    else if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found') { m = 'Invalid login credentials'; }
    else if (c === 'auth/weak-password') m = 'Password should be at least 6 characters';
    else if (c === 'auth/invalid-email') m = 'Unable to validate email address: invalid format';
    else if (c === 'auth/too-many-requests') { m = 'For security purposes, you can only request this once every 60 seconds'; status = 429; }
    else if (c === 'auth/network-request-failed') m = 'Failed to fetch';
    else if (c === 'auth/requires-recent-login') m = 'Session expirée : reconnectez-vous puis réessayez.';
    var err = new Error(m); err.status = status; err.code = c; return err;
  }

  async function getImpl() {
    if (_impl) return _impl;
    if (_implP) return _implP;
    _implP = (async function () {
      var t0 = Date.now();
      while (Date.now() - t0 < 20000) {
        if (window._fbAuth) { // index.html / inscription.html : SDK modulaire
          var m = await import(FB_AUTH_URL), a = window._fbAuth;
          try { a.languageCode = 'fr'; } catch (e) {}
          _impl = {
            auth: a,
            signIn: function (e, p) { return m.signInWithEmailAndPassword(a, e, p); },
            signUp: function (e, p) { return m.createUserWithEmailAndPassword(a, e, p); },
            signOut: function () { return m.signOut(a); },
            reset: function (e) { return m.sendPasswordResetEmail(a, e); },
            verify: function (u) { return m.sendEmailVerification(u); },
            setPw: function (u, p) { return m.updatePassword(u, p); },
            onChange: function (cb) { return m.onAuthStateChanged(a, cb); }
          };
          return _impl;
        }
        if (window.firebase && window.firebase.apps && window.firebase.apps.length && typeof window.firebase.auth === 'function') { // admin.html : SDK compat
          var b = window.firebase.auth();
          try { b.languageCode = 'fr'; } catch (e) {}
          _impl = {
            auth: b,
            signIn: function (e, p) { return b.signInWithEmailAndPassword(e, p); },
            signUp: function (e, p) { return b.createUserWithEmailAndPassword(e, p); },
            signOut: function () { return b.signOut(); },
            reset: function (e) { return b.sendPasswordResetEmail(e); },
            verify: function (u) { return u.sendEmailVerification(); },
            setPw: function (u, p) { return u.updatePassword(p); },
            onChange: function (cb) { return b.onAuthStateChanged(cb); }
          };
          return _impl;
        }
        await wait(100);
      }
      throw new Error('Firebase Auth indisponible');
    })();
    _implP.catch(function () { _implP = null; });
    return _implP;
  }

  async function currentUser() {
    var I = await getImpl();
    if (!_first) {
      _first = new Promise(function (res) {
        var un = I.onChange(function (u) { try { un(); } catch (e) {} res(u); });
      });
    }
    await _first;
    return I.auth.currentUser;
  }

  function metaOf(uid) { try { return JSON.parse(localStorage.getItem('gsc_meta_' + uid) || '{}'); } catch (e) { return {}; } }
  function toUser(u) {
    if (!u) return null;
    return {
      id: u.uid, email: u.email || '', phone: u.phoneNumber || '',
      user_metadata: metaOf(u.uid), app_metadata: { provider: 'email' },
      identities: [{ provider: 'email' }],
      email_confirmed_at: u.emailVerified ? new Date().toISOString() : null,
      created_at: (u.metadata && u.metadata.creationTime) || null
    };
  }
  async function toSession(u, force) {
    if (!u) return null;
    var r = await u.getIdTokenResult(!!force);
    var exp = Math.floor(new Date(r.expirationTime).getTime() / 1000);
    return { access_token: r.token, refresh_token: '', token_type: 'bearer', expires_at: exp,
             expires_in: exp - Math.floor(Date.now() / 1000), user: toUser(u) };
  }

  function emit(ev, u) {
    toSession(u).then(function (s) {
      _subs.slice().forEach(function (x) { try { x.cb(ev, s); } catch (e) { console.error(e); } });
    });
  }
  function startListener() {
    if (_listenerOn) return; _listenerOn = true;
    getImpl().then(function (I) {
      I.onChange(function (u) {
        var uid = u ? u.uid : null, ev = null;
        if (_last === undefined) ev = 'INITIAL_SESSION';
        else if (u && uid !== _last) ev = 'SIGNED_IN';
        else if (!u && _last) ev = 'SIGNED_OUT';
        _last = uid; _cur = u; _initDone = true;
        if (ev) emit(ev, u);
      });
    }).catch(function (e) { console.error('[GSC Auth]', e); });
  }

  var auth = {
    getSession: async function () {
      try { return { data: { session: await toSession(await currentUser()) }, error: null }; }
      catch (e) { return { data: { session: null }, error: mkErr(e) }; }
    },
    refreshSession: async function () {
      try {
        var u = await currentUser();
        if (!u) return { data: { session: null, user: null }, error: mkErr({ message: 'Auth session missing' }) };
        var s = await toSession(u, true);
        return { data: { session: s, user: s.user }, error: null };
      } catch (e) { return { data: { session: null, user: null }, error: mkErr(e) }; }
    },
    signInWithPassword: async function (o) {
      try {
        var I = await getImpl(), c = await I.signIn(o.email, o.password);
        return { data: { user: toUser(c.user), session: await toSession(c.user) }, error: null };
      } catch (e) { return { data: { user: null, session: null }, error: mkErr(e) }; }
    },
    signUp: async function (o) {
      try {
        var I = await getImpl(), c = await I.signUp(o.email, o.password), u = c.user;
        try { localStorage.setItem('gsc_meta_' + u.uid, JSON.stringify((o.options && o.options.data) || {})); } catch (e) {}
        try { await I.verify(u); } catch (e) { console.warn('E-mail de vérification non envoyé', e); }
        return { data: { user: toUser(u), session: await toSession(u) }, error: null };
      } catch (e) { return { data: { user: null, session: null }, error: mkErr(e) }; }
    },
    signOut: async function () {
      try { var I = await getImpl(); await I.signOut(); return { error: null }; }
      catch (e) { return { error: mkErr(e) }; }
    },
    resetPasswordForEmail: async function (email) {
      try { var I = await getImpl(); await I.reset(email); return { data: {}, error: null }; }
      catch (e) { return { data: null, error: mkErr(e) }; }
    },
    updateUser: async function (o) {
      try {
        var I = await getImpl(), u = await currentUser();
        if (!u) throw { message: 'Auth session missing' };
        if (o && o.password) await I.setPw(u, o.password);
        return { data: { user: toUser(u) }, error: null };
      } catch (e) { return { data: { user: null }, error: mkErr(e) }; }
    },
    resend: async function () {
      try {
        var I = await getImpl(), u = await currentUser();
        if (!u) throw { message: 'Connectez-vous pour renvoyer le message de confirmation.' };
        await I.verify(u); return { data: {}, error: null };
      } catch (e) { return { data: null, error: mkErr(e) }; }
    },
    onAuthStateChange: function (cb) {
      var sub = { cb: cb }; _subs.push(sub); startListener();
      if (_initDone) { var u = _cur; toSession(u).then(function (s) { try { cb('INITIAL_SESSION', s); } catch (e) {} }); }
      return { data: { subscription: { unsubscribe: function () { _subs = _subs.filter(function (x) { return x !== sub; }); } } } };
    }
  };

  window._gscEnsureAuth = async function () {
    var u = await currentUser();
    if (!u) throw new Error('Aucune session Firebase active.');
    return u;
  };
  window.supabase = { createClient: function () { return { auth: auth }; }, __gscFirebaseShim: true };
})();
