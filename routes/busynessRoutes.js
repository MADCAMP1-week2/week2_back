const router = require("express").Router();
const busynessCtrl = require("../controllers/busynessController");
const { authenticateAccessToken } = require("../middlewares/authMiddleware");

router.get("/today", authenticateAccessToken, busynessCtrl.getTodayBusyness);

module.exports = router;
