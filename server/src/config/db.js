'use strict';
/**
 * db.js  —  Smart Firestore proxy with automatic UNAUTHENTICATED fallback.
 *
 * Usage in controllers:
 *   const db = require('../config/db');
 *   await db.collection('materials').where('userId', '==', uid).get();
 *   await db.collection('materials').add({ ...data, createdAt: db.FieldValue.serverTimestamp() });
 *
 * When Firestore credentials are invalid and any query returns 16 UNAUTHENTICATED,
 * this module permanently switches to localCollection (JSON-file store) for the
 * rest of the server's lifetime.  No controller changes needed except swapping
 * `global.db` for `require('../config/db')`.
 */

const localDb = require('./localCollection');
const crypto = require('crypto');

let firestoreFailed = false;

const isUnauthenticated = (err) => {
  const msg = String(err?.message || err?.code || err?.details || '');
  return msg.includes('UNAUTHENTICATED') || msg.includes('invalid authentication credentials');
};

const markFailed = () => {
  if (!firestoreFailed) {
    console.warn(
      '[DB] ⚠️  Firestore UNAUTHENTICATED — credentials invalid. ' +
        'Switching permanently to local JSON data store. ' +
        'Set valid FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY to use Firestore.'
    );
    firestoreFailed = true;
  }
};

/** Try firestoreThunk(); on UNAUTHENTICATED set flag and run localThunk() instead. */
const withFallback = async (firestoreThunk, localThunk) => {
  if (firestoreFailed || !global.db) return localThunk();
  try {
    return await firestoreThunk();
  } catch (err) {
    if (isUnauthenticated(err)) {
      markFailed();
      return localThunk();
    }
    throw err;
  }
};

// ── SmartQuery ───────────────────────────────────────────────────────────────
class SmartQuery {
  constructor(colName, conds, order, limitN) {
    this._col = colName;
    this._conds = conds || [];
    this._order = order || null;
    this._limitN = limitN || null;
  }

  where(field, op, value) {
    return new SmartQuery(
      this._col,
      [...this._conds, { field, op, value }],
      this._order,
      this._limitN
    );
  }

  orderBy(field, dir = 'asc') {
    return new SmartQuery(this._col, this._conds, { field, dir }, this._limitN);
  }

  limit(n) {
    return new SmartQuery(this._col, this._conds, this._order, n);
  }

  _buildFs() {
    let q = global.db.collection(this._col);
    for (const { field, op, value } of this._conds) q = q.where(field, op, value);
    if (this._order) q = q.orderBy(this._order.field, this._order.dir);
    if (this._limitN) q = q.limit(this._limitN);
    return q;
  }

  _buildLocal() {
    let q = localDb.collection(this._col);
    for (const { field, op, value } of this._conds) q = q.where(field, op, value);
    if (this._order) q = q.orderBy(this._order.field, this._order.dir);
    if (this._limitN) q = q.limit(this._limitN);
    return q;
  }

  async get() {
    return withFallback(
      () => this._buildFs().get(),
      () => this._buildLocal().get()
    );
  }
}

// ── SmartDocRef ──────────────────────────────────────────────────────────────
class SmartDocRef {
  constructor(colName, docId) {
    this._col = colName;
    this._id = docId;
    this.id = docId;
  }

  /** Allows passing doc.ref to a batch after reading from a SmartQuery. */
  get ref() { return this; }

  async get() {
    return withFallback(
      () => global.db.collection(this._col).doc(this._id).get(),
      () => localDb.collection(this._col).doc(this._id).get()
    );
  }

  async set(data) {
    return withFallback(
      () => global.db.collection(this._col).doc(this._id).set(data),
      () => localDb.collection(this._col).doc(this._id).set(data)
    );
  }

  async update(data) {
    return withFallback(
      () => global.db.collection(this._col).doc(this._id).update(data),
      () => localDb.collection(this._col).doc(this._id).update(data)
    );
  }

  async delete() {
    return withFallback(
      () => global.db.collection(this._col).doc(this._id).delete(),
      () => localDb.collection(this._col).doc(this._id).delete()
    );
  }
}

// ── SmartCollectionRef ───────────────────────────────────────────────────────
class SmartCollectionRef extends SmartQuery {
  constructor(name) { super(name); }

  doc(id) {
    return new SmartDocRef(this._col, id || crypto.randomBytes(10).toString('hex'));
  }

  async add(data) {
    return withFallback(
      () => global.db.collection(this._col).add(data),
      () => localDb.collection(this._col).add(data)
    );
  }
}

// ── SmartBatch ───────────────────────────────────────────────────────────────
class SmartBatch {
  constructor() { this._ops = []; }

  delete(docRef) { this._ops.push({ type: 'delete', docRef }); return this; }
  set(docRef, data) { this._ops.push({ type: 'set', docRef, data }); return this; }
  update(docRef, data) { this._ops.push({ type: 'update', docRef, data }); return this; }

  async commit() {
    if (!firestoreFailed && global.db) {
      try {
        const fsBatch = global.db.batch();
        for (const op of this._ops) {
          let fsRef;
          if (op.docRef instanceof SmartDocRef) {
            fsRef = global.db.collection(op.docRef._col).doc(op.docRef._id);
          } else if (op.docRef && typeof op.docRef.path === 'string') {
            // Raw Firestore DocumentReference — extract collection / id from path
            const parts = op.docRef.path.split('/');
            const id = parts[parts.length - 1];
            const col = parts.slice(0, -1).join('/');
            fsRef = global.db.collection(col).doc(id);
          } else {
            continue; // unknown ref type — skip
          }
          if (op.type === 'delete') fsBatch.delete(fsRef);
          else if (op.type === 'set') fsBatch.set(fsRef, op.data);
          else if (op.type === 'update') fsBatch.update(fsRef, op.data);
        }
        return await fsBatch.commit();
      } catch (err) {
        if (isUnauthenticated(err)) {
          markFailed();
          // fall through to local path below
        } else {
          throw err;
        }
      }
    }

    // Local fallback — docRefs are either SmartDocRef or localCollection.DocumentRef,
    // both of which implement delete/set/update.
    for (const op of this._ops) {
      const ref = op.docRef;
      if (typeof ref.delete === 'function') {
        if (op.type === 'delete') await ref.delete();
        else if (op.type === 'set') await ref.set(op.data);
        else if (op.type === 'update') await ref.update(op.data);
      } else if (ref && typeof ref.path === 'string') {
        // raw Firestore DocumentReference — fall back to localDb
        const parts = ref.path.split('/');
        const id = parts[parts.length - 1];
        const col = parts.slice(0, -1).join('/');
        if (op.type === 'delete') await localDb.collection(col).doc(id).delete();
        else if (op.type === 'set') await localDb.collection(col).doc(id).set(op.data);
        else if (op.type === 'update') await localDb.collection(col).doc(id).update(op.data);
      }
    }
  }
}

// ── FieldValue ───────────────────────────────────────────────────────────────
// Always-safe FieldValue: returns real Firestore sentinels when Firestore is live,
// or lightweight local sentinels when in fallback mode.
// localCollection.resolveFieldValue understands both formats.
const FieldValue = {
  serverTimestamp: () => {
    if (!firestoreFailed && global.db) {
      try { return require('firebase-admin').firestore.FieldValue.serverTimestamp(); } catch { /* fall */ }
    }
    return { __type: 'serverTimestamp' };
  },
  arrayUnion: (...args) => {
    if (!firestoreFailed && global.db) {
      try { return require('firebase-admin').firestore.FieldValue.arrayUnion(...args); } catch { /* fall */ }
    }
    return { __type: 'arrayUnion', value: args[0] };
  },
  arrayRemove: (...args) => {
    if (!firestoreFailed && global.db) {
      try { return require('firebase-admin').firestore.FieldValue.arrayRemove(...args); } catch { /* fall */ }
    }
    return { __type: 'arrayRemove', value: args[0] };
  },
};

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  collection: (name) => new SmartCollectionRef(name),
  batch: () => new SmartBatch(),
  FieldValue,
};
