const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const admin = require('firebase-admin');
const localAuthStore = require('../config/localAuthStore');

const isFirestoreAuthError = (error) => {
  const msg = String(error?.message || '');
  return msg.includes('UNAUTHENTICATED') || msg.includes('invalid authentication credentials');
};

const withAuthStoreFallback = async (firestoreOperation, fallbackOperation) => {
  if (!global.db) {
    return await fallbackOperation();
  }
  try {
    return await firestoreOperation();
  } catch (error) {
    if (isFirestoreAuthError(error)) {
      console.warn('[AUTH] Falling back to local auth store due to Firestore auth error');
      return await fallbackOperation();
    }
    throw error;
  }
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const getFirebaseApiKey = () => (process.env.FIREBASE_WEB_API_KEY || '').trim();

const verifyFirebaseUserFromIdToken = async (idToken) => {
  const firebaseApiKey = getFirebaseApiKey();
  if (!firebaseApiKey) {
    const error = new Error('FIREBASE_WEB_API_KEY is not configured on server');
    error.statusCode = 500;
    throw error;
  }

  const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`;
  const verifyResponse = await axios.post(verifyUrl, { idToken });
  return verifyResponse?.data?.users?.[0] || null;
};

const findUserByIdentity = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);

  return withAuthStoreFallback(
    async () => {
      const db = global.db;
      const usersRef = db.collection('users');

      if (normalizedEmail) {
        const emailSnapshot = await usersRef.where('email', '==', normalizedEmail).limit(1).get();
        if (!emailSnapshot.empty) {
          const userDoc = emailSnapshot.docs[0];
          return { id: userDoc.id, ...userDoc.data() };
        }
      }

      return null;
    },
    async () => {
      if (normalizedEmail) {
        return localAuthStore.findUserByEmail(normalizedEmail);
      }

      return null;
    }
  );
};

const sanitizeUserResponse = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email || null,
});

const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};
    const normalizedName = String(name || '').trim();
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = String(password || '');

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    if (typeof confirmPassword !== 'undefined' && normalizedPassword !== String(confirmPassword)) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await findUserByIdentity({ email: normalizedEmail });

    if (existingUser) {
      // Existing social account can set password and continue with email/password login.
      if (!existingUser.password) {
        const hashedPasswordForExistingUser = await bcrypt.hash(normalizedPassword, 10);

        await withAuthStoreFallback(
          async () => {
            const db = global.db;
            const usersRef = db.collection('users');
            await usersRef.doc(existingUser.id).update({
              password: hashedPasswordForExistingUser,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          },
          async () => {
            await localAuthStore.updateUser(existingUser.id, {
              password: hashedPasswordForExistingUser,
            });
          }
        );

        const token = jwt.sign({ id: existingUser.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({
          message: 'Password set successfully. You can now log in with email and password.',
          token,
          user: sanitizeUserResponse(existingUser),
        });
      }

      return res.status(400).json({ message: 'User already exists. Please login instead.' });
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);
    const newUserData = {
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      oauthProvider: 'local',
      oauthId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const createdUser = await withAuthStoreFallback(
      async () => {
        const db = global.db;
        const usersRef = db.collection('users');
        const newUserRef = await usersRef.add(newUserData);
        return { id: newUserRef.id, ...newUserData };
      },
      async () => localAuthStore.createUser(newUserData)
    );
    const userId = createdUser.id;

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: sanitizeUserResponse({ id: userId, name: normalizedName, email: normalizedEmail }),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email = '', password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await findUserByIdentity({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'This account uses social login. Please continue with Google or GitHub.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: sanitizeUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

const oauthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'OAuth authentication failed' });
    }

    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    return res.redirect(`${clientUrl}/login?token=${encodeURIComponent(token)}`);
  } catch (error) {
    return res.status(500).json({ message: 'Error finishing OAuth login', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const userData = await withAuthStoreFallback(
      async () => {
        const db = global.db;
        const userDoc = await db.collection('users').doc(req.userId).get();
        if (!userDoc.exists) {
          return null;
        }
        return { id: userDoc.id, ...userDoc.data() };
      },
      async () => localAuthStore.findUserById(req.userId)
    );

    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }
    delete userData.password; // Remove password from response
    
    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

const firebaseGoogleLogin = async (req, res) => {
  try {
    const { idToken } = req.body || {};

    console.log('[FIREBASE-AUTH] Starting Firebase Google login');
    console.log('[FIREBASE-AUTH] idToken received:', idToken ? `${idToken.substring(0, 20)}... (${idToken.length} chars)` : 'NOT PROVIDED');

    if (!idToken) {
      return res.status(400).json({ message: 'Firebase idToken is required' });
    }

    console.log('[FIREBASE-AUTH] Verifying token with Firebase Identity Toolkit API');
    const firebaseUser = await verifyFirebaseUserFromIdToken(idToken);
    
    console.log('[FIREBASE-AUTH] Firebase user data received:', firebaseUser ? { email: firebaseUser.email, displayName: firebaseUser.displayName } : 'NONE');

    if (!firebaseUser || !firebaseUser.email) {
      console.error('[FIREBASE-AUTH] Firebase token verification failed: no user identity');
      return res.status(401).json({ message: 'Invalid Firebase token' });
    }

    const email = normalizeEmail(firebaseUser.email);
    const name = firebaseUser.displayName || email.split('@')[0] || 'User';
    const oauthId = firebaseUser.localId || null;
    const avatar = firebaseUser.photoUrl || null;
    const providerId = firebaseUser?.providerUserInfo?.[0]?.providerId || 'firebase';
    const oauthProvider =
      providerId === 'google.com'
        ? 'google'
        : providerId === 'github.com'
          ? 'github'
          : providerId === 'password'
            ? 'local'
            : 'firebase';

    console.log('[FIREBASE-AUTH] Verified Firebase user:', { email, name, providerId, oauthProvider });

    const user = await withAuthStoreFallback(
      async () => {
        const db = global.db;
        const usersRef = db.collection('users');
        const userSnapshot = await usersRef.where('email', '==', email).limit(1).get();

        if (userSnapshot.empty) {
          console.log('[FIREBASE-AUTH] Creating new user from Firebase data');
          const newUserData = {
            name,
            email,
            oauthProvider,
            oauthId,
            avatar,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          const newUserRef = await usersRef.add(newUserData);
          return { id: newUserRef.id, ...newUserData };
        }

        const userDoc = userSnapshot.docs[0];
        const existingUser = { id: userDoc.id, ...userDoc.data() };
        const updateData = {
          oauthProvider: existingUser.oauthProvider || oauthProvider,
          oauthId: existingUser.oauthId || oauthId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (!existingUser.email && email) {
          updateData.email = email;
        }
        if (!existingUser.avatar && avatar) {
          updateData.avatar = avatar;
        }
        if (!existingUser.name && name) {
          updateData.name = name;
        }

        await usersRef.doc(existingUser.id).update(updateData);
        return { ...existingUser, ...updateData };
      },
      async () => {
        const existingUser = await findUserByIdentity({ email });
        if (!existingUser) {
          return localAuthStore.createUser({
            name,
            email,
            oauthProvider,
            oauthId,
            avatar,
          });
        }

        const updateData = {
          oauthProvider: existingUser.oauthProvider || oauthProvider,
          oauthId: existingUser.oauthId || oauthId,
        };
        if (!existingUser.email && email) {
          updateData.email = email;
        }
        if (!existingUser.avatar && avatar) {
          updateData.avatar = avatar;
        }
        if (!existingUser.name && name) {
          updateData.name = name;
        }
        return localAuthStore.updateUser(existingUser.id, updateData);
      }
    );

    const userId = user.id;

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log('[FIREBASE-AUTH] ✅ Login successful, JWT issued');
    return res.json({
      message: 'Firebase login successful',
      token,
      user: sanitizeUserResponse({ ...user, id: userId }),
    });
  } catch (error) {
    const providerMessage = error?.response?.data?.error?.message || error?.message;

    console.error('[FIREBASE-AUTH] ❌ Error:', {
      message: providerMessage,
      status: error?.response?.status,
      errorCode: error?.response?.data?.error?.code,
      fullError: error?.response?.data || error?.message,
    });

    if (providerMessage === 'CONFIGURATION_NOT_FOUND') {
      return res.status(400).json({
        message: 'Google sign-in is not enabled in Firebase Authentication. Please enable it in Firebase Console → Authentication → Sign-in methods.',
        error: providerMessage,
        hint: 'Also configure OAuth consent screen and add localhost to authorized domains.',
      });
    }

    if (providerMessage === 'INVALID_ID_TOKEN') {
      return res.status(401).json({
        message: 'Invalid Firebase ID token. Make sure Google Sign-In is properly configured in Firebase.',
        error: providerMessage,
      });
    }

    return res.status(401).json({ 
      message: 'Firebase login failed', 
      error: providerMessage,
      hint: 'Check Firebase Console configuration and browser console logs',
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  oauthSuccess,
  firebaseGoogleLogin,
};
