const router = require('express').Router();
const scheduleCtrl = require('../controllers/scheduleController');
const { authenticateAccessToken } = require("../middlewares/authMiddleware");

router.get("/", authenticateAccessToken, scheduleCtrl.getSchedules); // ?start=&end=
router.post("/", authenticateAccessToken, scheduleCtrl.createSchedule);

router.patch("/:id", authenticateAccessToken, scheduleCtrl.updateSchedule);
router.delete("/:id", authenticateAccessToken, scheduleCtrl.deleteSchedule);

module.exports = router;
