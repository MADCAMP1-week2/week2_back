const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/check-id', authController.checkDuplicate);
router.post("/refresh", authController.refreshToken);
router.post("/logout-all", authController.logoutAllDevices);
router.post("/logout", authController.logout)
router.get("/devices", authController.listActiveDevices);

module.exports = router;