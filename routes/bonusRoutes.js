const router = require("express").Router();
const bonusCtrl = require("../controllers/bonusController");
const { authenticateAccessToken } = require("../middlewares/authMiddleware");

router.get("/:date", authenticateAccessToken, bonusCtrl.getBonusOfWeek);
router.get(
  "/rank/:date",
  authenticateAccessToken,
  bonusCtrl.getBonusRankOfWeek
);

module.exports = router;
