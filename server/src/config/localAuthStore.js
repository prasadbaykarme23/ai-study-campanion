const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(process.cwd(), 'data');
const dataFilePath = path.join(dataDir, 'local-users.json');

const ensureDataFile = async () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({ users: [] }, null, 2), 'utf8');
  }
};

const readStore = async () => {
  await ensureDataFile();
  const raw = fs.readFileSync(dataFilePath, 'utf8');
  const parsed = JSON.parse(raw || '{"users":[]}');
  if (!Array.isArray(parsed.users)) {
    return { users: [] };
  }
  return parsed;
};

const writeStore = async (store) => {
  await ensureDataFile();
  fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2), 'utf8');
};

const createUser = async (payload) => {
  const store = await readStore();
  const user = {
    id: crypto.randomUUID(),
    name: payload.name || '',
    email: String(payload.email || '').toLowerCase(),
    password: payload.password || null,
    oauthProvider: payload.oauthProvider || 'local',
    oauthId: payload.oauthId || null,
    avatar: payload.avatar || null,
    weakTopics: payload.weakTopics || {},
    studyTopics: payload.studyTopics || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.users.push(user);
  await writeStore(store);
  return user;
};

const findUserByEmail = async (email) => {
  const store = await readStore();
  return store.users.find((u) => u.email === String(email || '').toLowerCase()) || null;
};

const findUserById = async (id) => {
  const store = await readStore();
  return store.users.find((u) => u.id === id) || null;
};

const updateUser = async (id, updates) => {
  const store = await readStore();
  const index = store.users.findIndex((u) => u.id === id);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...store.users[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  store.users[index] = updated;
  await writeStore(store);
  return updated;
};

const getAllUsers = async () => {
  const store = await readStore();
  return store.users;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  getAllUsers,
};
