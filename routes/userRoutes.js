const router = require("express").Router();
const userCtrl = require("../controllers/userController");
const { authenticateAccessToken } = require("../middlewares/authMiddleware");

router.get("/search", authenticateAccessToken, userCtrl.searchUsers);
router.post("/fcm-token", authenticateAccessToken, userCtrl.updateFcmToken);

module.exports = router;
