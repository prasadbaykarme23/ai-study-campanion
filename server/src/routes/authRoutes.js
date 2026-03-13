const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Check if passport is available
let passport = null;
let socialAuthEnabled = { google: false, github: false };

try {
  const passportModule = require('../config/passport');
  passport = passportModule.passport;
  socialAuthEnabled = {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  };
} catch (error) {
  console.log('[AUTH_ROUTES] OAuth not available');
}

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/firebase/google', authController.firebaseGoogleLogin);
router.post('/firebase/login', authController.firebaseGoogleLogin);

// OAuth routes (only if passport is available)
if (passport && socialAuthEnabled.google) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
  router.get('/google/callback', passport.authenticate('google', { session: false }), authController.oauthSuccess);
} else {
  router.get('/google', (req, res) => res.status(503).json({ message: 'Google login is not configured on server' }));
  router.get('/google/callback', (req, res) => res.status(503).json({ message: 'Google login is not configured on server' }));
}

if (passport && socialAuthEnabled.github) {
  router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
  router.get('/github/callback', passport.authenticate('github', { session: false }), authController.oauthSuccess);
} else {
  router.get('/github', (req, res) => res.status(503).json({ message: 'GitHub login is not configured on server' }));
  router.get('/github/callback', (req, res) => res.status(503).json({ message: 'GitHub login is not configured on server' }));
}

module.exports = router;
