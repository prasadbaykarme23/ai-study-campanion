const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: GitHubStrategy } = require('passport-github2');
const admin = require('firebase-admin');
const localAuthStore = require('./localAuthStore');

const makeFallbackEmail = (provider, providerId) => `${provider}_${providerId}@oauth.local`;

const isFirestoreAuthError = (error) => {
  const msg = String(error?.message || '');
  return msg.includes('UNAUTHENTICATED') || msg.includes('invalid authentication credentials');
};

const upsertOAuthUserViaFirestore = async ({ provider, providerId, name, email, avatar }) => {
  const db = global.db;
  const usersRef = db.collection('users');

  let userSnapshot;

  if (providerId) {
    userSnapshot = await usersRef.where('oauthId', '==', providerId).where('oauthProvider', '==', provider).limit(1).get();
  }

  if (!userSnapshot || userSnapshot.empty) {
    if (email) {
      userSnapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();
    }
  }

  if (!userSnapshot || userSnapshot.empty) {
    const newUserData = {
      name: name || 'Student',
      email: email ? email.toLowerCase() : makeFallbackEmail(provider, providerId),
      oauthProvider: provider,
      oauthId: providerId,
      avatar: avatar || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const newUserRef = await usersRef.add(newUserData);
    return {
      id: newUserRef.id,
      name: newUserData.name,
      email: newUserData.email,
      oauthProvider: provider,
      oauthId: providerId,
      avatar: newUserData.avatar,
    };
  }

  const userDoc = userSnapshot.docs[0];
  const userId = userDoc.id;
  const userData = { id: userId, ...userDoc.data() };

  const updateData = { oauthProvider: provider, oauthId: providerId };
  if (!userData.avatar && avatar) updateData.avatar = avatar;
  if (name && !userData.name) updateData.name = name;

  await usersRef.doc(userId).update({
    ...updateData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ...userData, ...updateData };
};

const upsertOAuthUserViaLocal = async ({ provider, providerId, name, email, avatar }) => {
  const resolvedEmail = email ? email.toLowerCase() : makeFallbackEmail(provider, providerId);
  const allUsers = await localAuthStore.getAllUsers();

  let existingUser =
    allUsers.find((u) => u.oauthId === String(providerId) && u.oauthProvider === provider) ||
    allUsers.find((u) => u.email === resolvedEmail) ||
    null;

  if (!existingUser) {
    return localAuthStore.createUser({
      name: name || 'Student',
      email: resolvedEmail,
      oauthProvider: provider,
      oauthId: String(providerId),
      avatar: avatar || null,
    });
  }

  const updates = { oauthProvider: provider, oauthId: String(providerId) };
  if (!existingUser.avatar && avatar) updates.avatar = avatar;
  if (name && !existingUser.name) updates.name = name;

  return localAuthStore.updateUser(existingUser.id, updates);
};

const upsertOAuthUser = async (payload) => {
  if (!global.db) {
    console.warn(`[PASSPORT] Firestore unavailable — using local auth store for ${payload.provider} OAuth`);
    return await upsertOAuthUserViaLocal(payload);
  }
  try {
    return await upsertOAuthUserViaFirestore(payload);
  } catch (error) {
    if (isFirestoreAuthError(error)) {
      console.warn(`[PASSPORT] Falling back to local auth store for ${payload.provider} OAuth`);
      return await upsertOAuthUserViaLocal(payload);
    }
    throw error;
  }
};

const configurePassport = () => {
  const serverOrigin = process.env.SERVER_URL || 'http://localhost:5000';

  const isGoogleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const isGithubEnabled = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

  if (isGoogleEnabled) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${serverOrigin}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await upsertOAuthUser({
              provider: 'google',
              providerId: profile.id,
              name: profile.displayName,
              email: profile.emails?.[0]?.value,
              avatar: profile.photos?.[0]?.value,
            });

            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        }
      )
    );
  }

  if (isGithubEnabled) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: `${serverOrigin}/api/auth/github/callback`,
          scope: ['user:email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const user = await upsertOAuthUser({
              provider: 'github',
              providerId: profile.id,
              name: profile.displayName || profile.username,
              email,
              avatar: profile.photos?.[0]?.value,
            });

            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        }
      )
    );
  }

  return { isGoogleEnabled, isGithubEnabled };
};

module.exports = {
  passport,
  configurePassport,
};
