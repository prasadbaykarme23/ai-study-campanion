'use strict';
/**
 * localCollection.js
 * Firestore-compatible collection store backed by local JSON files.
 * Used as automatic fallback when Firebase Admin credentials are invalid.
 *
 * Stores each collection in: <cwd>/data/col_<name>.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(process.cwd(), 'data');

const ensureDir = () => {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
};

const colFile = (name) => path.join(dataDir, `col_${name}.json`);

const readCol = (name) => {
  ensureDir();
  const f = colFile(name);
  if (!fs.existsSync(f)) return {};
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8') || '{}');
  } catch {
    return {};
  }
};

const writeCol = (name, data) => {
  ensureDir();
  fs.writeFileSync(colFile(name), JSON.stringify(data, null, 2), 'utf8');
};

const newId = () => crypto.randomBytes(10).toString('hex');

/**
 * Resolve any FieldValue sentinel to a plain value suitable for JSON storage.
 * Handles both our own simple sentinels ({ __type }) and the real Firebase Admin
 * SDK FieldTransform objects (which carry a _methodName string).
 */
const resolveFieldValue = (existing, value) => {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  // ── our own lightweight sentinels ──────────────────────────────────────────
  if (value.__type === 'serverTimestamp') return new Date().toISOString();
  if (value.__type === 'arrayUnion') {
    const arr = Array.isArray(existing) ? [...existing] : [];
    if (!arr.includes(value.value)) arr.push(value.value);
    return arr;
  }
  if (value.__type === 'arrayRemove') {
    const arr = Array.isArray(existing) ? [...existing] : [];
    return arr.filter((v) => v !== value.value);
  }

  // ── Firebase Admin SDK FieldTransform sentinels ────────────────────────────
  // These have a _methodName like 'FieldValue.serverTimestamp', 'FieldValue.arrayUnion', etc.
  if (typeof value._methodName === 'string') {
    const method = value._methodName.replace('FieldValue.', '');
    if (method === 'serverTimestamp') return new Date().toISOString();
    if (method === 'arrayUnion') {
      const arr = Array.isArray(existing) ? [...existing] : [];
      const items = value._values || value._elements || [];
      for (const item of items) {
        if (!arr.includes(item)) arr.push(item);
      }
      return arr;
    }
    if (method === 'arrayRemove') {
      const arr = Array.isArray(existing) ? [...existing] : [];
      const items = value._values || value._elements || [];
      return arr.filter((v) => !items.includes(v));
    }
  }

  return value; // plain object / array — store as-is
};

const processData = (existing, incoming) => {
  const result = existing ? { ...existing } : {};
  for (const [k, v] of Object.entries(incoming)) {
    result[k] = resolveFieldValue(result[k], v);
  }
  return result;
};

// ── DocumentRef ──────────────────────────────────────────────────────────────
class DocumentRef {
  constructor(colName, docId) {
    this.collectionName = colName;
    this.id = docId;
  }

  get ref() { return this; }

  async get() {
    const col = readCol(this.collectionName);
    const data = col[this.id];
    if (!data) return { exists: false, id: this.id, data: () => null, ref: this };
    return { exists: true, id: this.id, data: () => ({ ...data }), ref: this };
  }

  async set(data) {
    const col = readCol(this.collectionName);
    col[this.id] = processData(undefined, data);
    writeCol(this.collectionName, col);
  }

  async update(data) {
    const col = readCol(this.collectionName);
    const existing = col[this.id] || {};
    col[this.id] = processData(existing, data);
    writeCol(this.collectionName, col);
  }

  async delete() {
    const col = readCol(this.collectionName);
    delete col[this.id];
    writeCol(this.collectionName, col);
  }
}

// ── Query ────────────────────────────────────────────────────────────────────
class Query {
  constructor(colName, conds, order, limitN) {
    this._col = colName;
    this._conds = conds || [];
    this._order = order || null;
    this._limitN = limitN || null;
  }

  where(field, op, value) {
    return new Query(this._col, [...this._conds, { field, op, value }], this._order, this._limitN);
  }

  orderBy(field, dir = 'asc') {
    return new Query(this._col, this._conds, { field, dir }, this._limitN);
  }

  limit(n) {
    return new Query(this._col, this._conds, this._order, n);
  }

  async get() {
    const col = readCol(this._col);
    let docs = Object.entries(col).map(([id, data]) => ({
      id,
      ref: new DocumentRef(this._col, id),
      exists: true,
      data: () => ({ ...data }),
    }));

    for (const { field, op, value } of this._conds) {
      docs = docs.filter((doc) => {
        const d = doc.data();
        if (op === '==') return d[field] === value;
        if (op === '!=') return d[field] !== value;
        if (op === 'array-contains') return Array.isArray(d[field]) && d[field].includes(value);
        if (op === 'in') return Array.isArray(value) && value.includes(d[field]);
        if (op === 'not-in') return Array.isArray(value) && !value.includes(d[field]);
        return true;
      });
    }

    if (this._order) {
      const { field, dir } = this._order;
      docs.sort((a, b) => {
        const av = a.data()[field] ?? '';
        const bv = b.data()[field] ?? '';
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return dir === 'desc' ? -cmp : cmp;
      });
    }

    if (this._limitN !== null) docs = docs.slice(0, this._limitN);

    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

// ── CollectionRef ────────────────────────────────────────────────────────────
class CollectionRef extends Query {
  constructor(name) { super(name); }

  doc(id) { return new DocumentRef(this._col, id || newId()); }

  async add(data) {
    const id = newId();
    const col = readCol(this._col);
    col[id] = processData(undefined, data);
    writeCol(this._col, col);
    return { id };
  }
}

// ── WriteBatch ───────────────────────────────────────────────────────────────
class WriteBatch {
  constructor() { this._ops = []; }

  delete(docRef) { this._ops.push({ type: 'delete', docRef }); return this; }
  set(docRef, data) { this._ops.push({ type: 'set', docRef, data }); return this; }
  update(docRef, data) { this._ops.push({ type: 'update', docRef, data }); return this; }

  async commit() {
    for (const op of this._ops) {
      if (op.type === 'delete') await op.docRef.delete();
      else if (op.type === 'set') await op.docRef.set(op.data);
      else if (op.type === 'update') await op.docRef.update(op.data);
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────
module.exports = {
  collection: (name) => new CollectionRef(name),
  batch: () => new WriteBatch(),
  newId,
  FieldValue: {
    serverTimestamp: () => ({ __type: 'serverTimestamp' }),
    arrayUnion: (value) => ({ __type: 'arrayUnion', value }),
    arrayRemove: (value) => ({ __type: 'arrayRemove', value }),
  },
};
