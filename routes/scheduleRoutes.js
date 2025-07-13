const router = require('express').Router();
const scheduleCtrl = require('../controllers/scheduleController');

router
  .route('/')
  .get(scheduleCtrl.getSchedules)   // ?start=&end=
  .post(scheduleCtrl.createSchedule);

router
  .route('/:id')
  .patch(scheduleCtrl.updateSchedule)
  .delete(scheduleCtrl.deleteSchedule);

module.exports = router;
