const Schedule = require('../models/Schedule');
const asyncHandler = require('../middlewares/asyncHandler');
const dayjs = require('dayjs');

// GET /api/schedules?start=YYYY-MM-DD&end=YYYY-MM-DD
exports.getSchedules = asyncHandler(async (req, res) => {
  const { start, end } = req.query;
  const owner = req.user.userId;

  if (!(start && end)) {
    return res.status(400).json({ message: "시작일과 종료일을 제공해주세요." });
  }

  const startDate = dayjs(start).startOf("day").toDate();
  const endDate = dayjs(end).endOf("day").toDate();

  const filter = {
    owner,
    startDateTime: { $lte: endDate }, // 종료 이전에 시작한 일정
    endDateTime: { $gte: startDate }, // 시작 이후에 끝나는 일정
  };

  const schedules = await Schedule.find(filter)
    .select("title startDateTime endDateTime project category") // projection
    .populate("project", "name") // 프로젝트 이름
    .populate("category", "name color") // 카테고리 정보
    .lean();

  res.json(schedules);
});

exports.createSchedule = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const newSched = await Schedule.create({ ...req.body, owner });
  res.status(201).json(newSched);
});

exports.updateSchedule = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const { id } = req.params;
  const sched = await Schedule.findOneAndUpdate({ _id: id, owner }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!sched) return res.status(404).json({ message: 'Schedule not found' });
  res.json(sched);
});

exports.deleteSchedule = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  await Schedule.findOneAndDelete({ _id: req.params.id, owner });
  res.status(204).end();
});
