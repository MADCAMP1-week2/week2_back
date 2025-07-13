const router = require("express").Router();
const userCtrl = require("../controllers/userController");
const { authenticateAccessToken } = require("../middlewares/authMiddleware");

router.get("/search", authenticateAccessToken, userCtrl.searchUsers);

module.exports = router;
