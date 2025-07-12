const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateAccessToken } = require("../middlewares/authMiddleware");

router.post('/register', 
  authController.register);
router.post('/login', 
  authController.login);
router.get('/check-id', 
  authController.checkDuplicate);
router.post("/refresh", 
  authController.refreshToken);
router.delete("/logout-all",
  authenticateAccessToken,
  authController.logoutAllDevices);
router.delete("/logout", 
  authenticateAccessToken,
  authController.logout)
router.get("/devices", 
  authenticateAccessToken,
  authController.listActiveDevices);

module.exports = router;