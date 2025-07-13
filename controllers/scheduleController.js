const Schedule = require('../models/Schedule');
const asyncHandler = require('../middlewares/asyncHandler');
const dayjs = require('dayjs');

// GET /api/schedules?start=YYYY-MM-DD&end=YYYY-MM-DD
exports.getSchedules = asyncHandler(async (req, res) => {
  const { start, end } = req.query;
  const owner = req.user.id;

  const filter = {
    owner,
    date: {
      $gte: dayjs(start).startOf('day').toDate(),
      $lte: dayjs(end).endOf('day').toDate(),
    },
  };

  const schedules = await Schedule.find(filter)
    .select('name date startTime endTime')   // projection
    .lean();

  res.json(schedules);
});

exports.createSchedule = asyncHandler(async (req, res) => {
  const owner = req.user.id;
  const newSched = await Schedule.create({ ...req.body, owner });
  res.status(201).json(newSched);
});

exports.updateSchedule = asyncHandler(async (req, res) => {
  const owner = req.user.id;
  const { id } = req.params;
  const sched = await Schedule.findOneAndUpdate(
    { _id: id, owner },
    req.body,
    { new: true, runValidators: true }
  );
  if (!sched) return res.status(404).json({ message: 'Schedule not found' });
  res.json(sched);
});

exports.deleteSchedule = asyncHandler(async (req, res) => {
  const owner = req.user.id;
  await Schedule.findOneAndDelete({ _id: req.params.id, owner });
  res.status(204).end();
});
