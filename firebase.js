// ============================================================
// PERSONAL-FINANCE : firebase.js
// Google ログイン + Firestore 同期 (ユーザーごとに完全分離)
// ============================================================
'use strict';

const FBCONF = {
  apiKey: "AIzaSyCFYZFq0NvbF_ujbrHKakVkAhkUFR2p3y0",
  authDomain: "personal-finance-160e5.firebaseapp.com",
  projectId: "personal-finance-160e5",
  storageBucket: "personal-finance-160e5.firebasestorage.app",
  messagingSenderId: "1064432313485",
  appId: "1:1064432313485:web:ab7e30466d593fde1f2ec4"
};

const FB = {
  ready: false, user: null, _app: null, _db: null, _auth: null,
  syncing: false
};

// ---------- 初期化 ----------
FB.init = function () {
  if (typeof firebase === 'undefined') return false;
  try {
    FB._app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(FBCONF);
    FB._auth = firebase.auth();
    FB._db = firebase.firestore();
    FB.ready = true;
    FB._auth.onAuthStateChanged(u => {
      FB.user = u;
      if (typeof renderFBStatus === 'function') renderFBStatus();
      if (u && typeof onFBLogin === 'function') onFBLogin(u);
    });
    return true;
  } catch (e) { console.warn('FB init failed', e); return false; }
};

// ---------- ログイン / ログアウト ----------
FB.login = function () {
  if (!FB.ready) return Promise.reject('not-ready');
  const p = new firebase.auth.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  // ポップアップ失敗時(モバイル等)はリダイレクト
  return FB._auth.signInWithPopup(p).catch(err => {
    if (err && /popup|blocked|closed/i.test(err.code || err.message || ''))
      return FB._auth.signInWithRedirect(p);
    throw err;
  });
};
FB.logout = function () { return FB.ready ? FB._auth.signOut() : Promise.resolve(); };

// ---------- ドキュメント参照 (uid ごとに分離) ----------
FB.doc = function () {
  if (!FB.ready || !FB.user) return null;
  return FB._db.collection('users').doc(FB.user.uid).collection('app').doc('main');
};

// ---------- アップロード ----------
FB.upload = function (D, SET) {
  const d = FB.doc();
  if (!d) return Promise.reject('no-login');
  FB.syncing = true;
  return d.set({
    data: JSON.stringify({ D: D, SET: SET }),
    count: (D.journals || []).length,
    fy: SET.fy || null,
    updated: new Date().toISOString(),
    email: FB.user.email || ''
  }).then(r => { FB.syncing = false; localStorage.setItem('pf_lastSync', new Date().toISOString()); return r; })
    .catch(e => { FB.syncing = false; throw e; });
};

// ---------- ダウンロード ----------
FB.download = function () {
  const d = FB.doc();
  if (!d) return Promise.reject('no-login');
  FB.syncing = true;
  return d.get().then(s => {
    FB.syncing = false;
    if (!s.exists) return null;
    const v = s.data();
    return { obj: JSON.parse(v.data), meta: v };
  }).catch(e => { FB.syncing = false; throw e; });
};

// ---------- メタ情報のみ取得 (上書き確認用) ----------
FB.peek = function () {
  const d = FB.doc();
  if (!d) return Promise.resolve(null);
  return d.get().then(s => s.exists ? { count: s.data().count, updated: s.data().updated } : null)
    .catch(() => null);
};

FB.lastSync = function () { return localStorage.getItem('pf_lastSync'); };
FB.daysSinceSync = function () {
  const d = FB.lastSync();
  if (!d) return 9999;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
};
