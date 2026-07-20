// src/modules/auth/auth.route.js
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

const authenticateUser = require('../../middlewares/authenticateUser');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.put('/profile', authenticateUser, authController.updateProfile);
router.get('/me', authenticateUser, authController.me);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

module.exports = router;