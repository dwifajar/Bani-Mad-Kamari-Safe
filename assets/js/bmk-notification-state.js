/* BANI MAD KAMARI — Notification state V14.50
   Shared by the page and the service worker.
   Stores unread notification IDs in IndexedDB and mirrors them to the app badge.
*/
(function (root) {
  'use strict';
  const DB_NAME = 'bmk-notification-state-v150';
  const DB_VERSION = 1;
  const STORE = 'state';
  const KEY = 'unreadIds';

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in root)) return reject(new Error('IndexedDB tidak tersedia.'));
      const req = root.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        try { req.result.createObjectStore(STORE); } catch (_) {}
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Gagal membuka IndexedDB.'));
    });
  }

  async function getUnreadIds() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve(new Set(Array.isArray(req.result) ? req.result.map(String) : []));
        req.onerror = () => reject(req.error || new Error('Gagal membaca status notifikasi.'));
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      });
    } catch (_) {
      return new Set();
    }
  }

  async function setUnreadIds(ids) {
    const list = [...new Set([...ids].map(String))];
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(list, KEY);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error || new Error('Gagal menyimpan status notifikasi.')); };
      });
    } catch (_) {}
    await updateBadge(list.length);
    return list.length;
  }

  async function addUnread(id) {
    if (!id) return 0;
    const ids = await getUnreadIds();
    ids.add(String(id));
    return setUnreadIds(ids);
  }

  async function removeUnread(id) {
    if (!id) return 0;
    const ids = await getUnreadIds();
    ids.delete(String(id));
    return setUnreadIds(ids);
  }

  async function updateBadge(count) {
    const n = Math.max(0, Number(count) || 0);
    try {
      if (typeof root.navigator?.setAppBadge === 'function') {
        if (n > 0) await root.navigator.setAppBadge(n);
        else if (typeof root.navigator.clearAppBadge === 'function') await root.navigator.clearAppBadge();
      }
    } catch (_) {}
    return n;
  }

  async function clearBadge() {
    try {
      if (typeof root.navigator?.clearAppBadge === 'function') await root.navigator.clearAppBadge();
    } catch (_) {}
  }

  root.BMKNotificationState = {
    getUnreadIds,
    setUnreadIds,
    addUnread,
    removeUnread,
    updateBadge,
    clearBadge,
    DB_NAME,
    DB_VERSION,
    STORE,
    KEY
  };
})(typeof self !== 'undefined' ? self : window);
