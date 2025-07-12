const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/check-id', authController.checkDuplicate);
router.post("/refresh", authController.refreshToken);

module.exports = router;