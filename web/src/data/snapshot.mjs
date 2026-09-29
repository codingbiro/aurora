// The last data the dashboard saw, kept in IndexedDB so the next visit can draw at once while the live feeds load.
// Every saved field carries the time it was last refreshed from its upstream, so data that kept failing is never
// passed off as fresh, and each field is only shown again while it is young enough (the caller decides how young).

export const SNAPSHOT_VERSION = 1; // bump whenever the shape of a saved state field changes
const DB_NAME = 'aurora', STORE = 'snapshot', KEY = 'latest';

export const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
export function setPath(obj, path, value) {
  const keys = path.split('.'); const last = keys.pop(); let o = obj;
  for (const k of keys) { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  o[last] = value;
}

/**
 * {version, savedAt, fields: {path: {t, v}}} for every path in `fieldTimes` ({path: time last refreshed}) that holds
 * a value; `compact` maps a path to a function that shrinks its value for storage.
 */
export function buildSnapshot(state, fieldTimes, now, compact = {}) {
  const fields = {};
  for (const [path, t] of Object.entries(fieldTimes)) {
    const v = getPath(state, path);
    if (v === undefined || v === null || !Number.isFinite(t)) continue;
    fields[path] = { t, v: compact[path] ? compact[path](v) : v };
  }
  return { version: SNAPSHOT_VERSION, savedAt: now, fields };
}

/** Saved fields still young enough to show: [{path, t, v}]; maxAge(path) is the limit in ms (0 = never). */
export function freshEntries(snap, now, maxAge) {
  if (!snap || snap.version !== SNAPSHOT_VERSION || !snap.fields || typeof snap.fields !== 'object') return [];
  const out = [];
  for (const [path, e] of Object.entries(snap.fields)) {
    if (!e || !Number.isFinite(e.t) || e.v === undefined) continue;
    const age = now - e.t, limit = maxAge(path);
    if (!(limit > 0) || age < -5 * 60e3 || age > limit) continue; // unknown field, a clock that jumped back, or too old
    out.push({ path, t: e.t, v: e.v });
  }
  return out;
}

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => { const d = req.result; d.onversionchange = () => d.close(); resolve(d); };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('indexedDB blocked'));
    }).catch(err => { dbPromise = null; throw err; });
  }
  return dbPromise;
}

/** The saved snapshot, or null (none, unreadable, or slower than timeoutMs: the page never waits long for it). */
export function readSnapshot({ timeoutMs = 1000 } = {}) {
  let read;
  try {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    read = db().then(d => new Promise((resolve, reject) => {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    }));
  } catch { return Promise.resolve(null); }
  let timer;
  const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(null), timeoutMs); });
  return Promise.race([read, timeout]).catch(() => null).finally(() => clearTimeout(timer));
}

/** Replace the saved snapshot. Resolves true when stored; never throws. */
export async function writeSnapshot(snap) {
  try {
    if (typeof indexedDB === 'undefined') return false;
    const d = await db();
    await new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(snap, KEY);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
    return true;
  } catch { return false; }
}
