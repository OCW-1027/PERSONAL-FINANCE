// ============================================================
// PERSONAL-FINANCE : safe.js
// データ保護 — IndexedDB 二重保存 / 自動スナップショット / バックアップ督促
// ============================================================
'use strict';

const SAFE = {
  DB: 'pf_safe', STORE: 'snap', KEEP: 20,   // 直近20世代を保持
  WARN_DAYS: 7,                              // 未バックアップ警告日数
  _db: null
};

// ---------- IndexedDB ----------
SAFE.open = function () {
  return new Promise((res, rej) => {
    if (SAFE._db) return res(SAFE._db);
    if (!window.indexedDB) return rej('no-idb');
    const r = indexedDB.open(SAFE.DB, 1);
    r.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(SAFE.STORE))
        db.createObjectStore(SAFE.STORE, { keyPath: 'ts' });
    };
    r.onsuccess = e => { SAFE._db = e.target.result; res(SAFE._db); };
    r.onerror = () => rej('idb-open-failed');
  });
};

// スナップショット保存 (localStorage 破損時の復旧用)
SAFE.snapshot = function (D, SET, tag) {
  return SAFE.open().then(db => new Promise((res, rej) => {
    const tx = db.transaction(SAFE.STORE, 'readwrite');
    const st = tx.objectStore(SAFE.STORE);
    st.put({
      ts: new Date().toISOString(),
      tag: tag || 'auto',
      count: (D.journals || []).length,
      data: JSON.stringify({ D: D, SET: SET })
    });
    tx.oncomplete = () => { SAFE.prune(); res(true); };
    tx.onerror = () => rej('snap-failed');
  })).catch(() => false);
};

// 古い世代を削除
SAFE.prune = function () {
  return SAFE.open().then(db => new Promise(res => {
    const tx = db.transaction(SAFE.STORE, 'readwrite');
    const st = tx.objectStore(SAFE.STORE);
    const req = st.getAllKeys();
    req.onsuccess = () => {
      const keys = req.result.sort();
      const over = keys.length - SAFE.KEEP;
      for (let i = 0; i < over; i++) st.delete(keys[i]);
      res(true);
    };
    req.onerror = () => res(false);
  })).catch(() => false);
};

// 世代一覧
SAFE.list = function () {
  return SAFE.open().then(db => new Promise(res => {
    const tx = db.transaction(SAFE.STORE, 'readonly');
    const req = tx.objectStore(SAFE.STORE).getAll();
    req.onsuccess = () => res((req.result || []).sort((a, b) => b.ts.localeCompare(a.ts)));
    req.onerror = () => res([]);
  })).catch(() => []);
};

// 世代から復元
SAFE.restore = function (ts) {
  return SAFE.open().then(db => new Promise((res, rej) => {
    const tx = db.transaction(SAFE.STORE, 'readonly');
    const req = tx.objectStore(SAFE.STORE).get(ts);
    req.onsuccess = () => req.result ? res(JSON.parse(req.result.data)) : rej('not-found');
    req.onerror = () => rej('restore-failed');
  }));
};

// ---------- バックアップ督促 ----------
SAFE.lastBackup = function () { return localStorage.getItem('pf_lastBackup'); };
SAFE.markBackup = function () { localStorage.setItem('pf_lastBackup', new Date().toISOString()); };
SAFE.daysSinceBackup = function () {
  const d = SAFE.lastBackup();
  if (!d) return 9999;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
};
SAFE.needBackup = function () { return SAFE.daysSinceBackup() >= SAFE.WARN_DAYS; };

// ---------- 保存容量チェック ----------
SAFE.usage = function () {
  let n = 0;
  for (const k in localStorage) if (localStorage.hasOwnProperty(k)) n += (localStorage[k] || '').length;
  return n;
};

// ---------- 起動時 自己診断 ----------
// localStorage が空なのに IndexedDB に世代がある = キャッシュ消去された可能性
SAFE.checkRecovery = function (hasLocal) {
  if (hasLocal) return Promise.resolve(null);
  return SAFE.list().then(l => (l && l.length) ? l[0] : null).catch(() => null);
};
