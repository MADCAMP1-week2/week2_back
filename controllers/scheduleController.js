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

  const startDate = dayjs(start).startOf("day");
  const endDate = dayjs(end).endOf("day");

  // 1. 반복 없는 일정
  const normalSchedules = await Schedule.find({
    owner,
    "repeat.type": "none",
    startDateTime: { $lte: endDate.toDate() }, // 종료 이전에 시작한 일정
    endDateTime: { $gte: startDate.toDate() }, // 시작 이후에 끝나는 일정
  })
    .select("_id title startDateTime endDateTime project category repeat") // projection
    .populate("project", "name") // 프로젝트 이름
    .populate("category", "name color") // 카테고리 정보
    .lean();

  // 2. 반복 일정 가져오기
  const repeatSchedules = await Schedule.find({
    owner,
    "repeat.type": { $ne: "none" },
    startDateTime: { $lte: endDate.toDate() }, // 반복 시작은 endDate 이전
    $or: [
      { "repeat.endDate": null }, // 반복 종료 없거나
      { "repeat.endDate": { $gte: startDate.toDate() } }, // 반복 종료가 startDate 이후
    ],
  })
    .select("_id title startDateTime endDateTime project category repeat") // projection
    .populate("project", "name")
    .populate("category", "name color")
    .lean();

  // 3. 반복일정 인스턴스화
  const expandedRepeats = [];

  for (const item of repeatSchedules) {
    // 각 반복 일정
    const { repeat, startDateTime, endDateTime } = item;
    const repeatEnd = repeat.endDate
      ? dayjs(repeat.endDate).endOf("day")
      : endDate;

    let cursor = dayjs(startDateTime);
    let instanceStart, instanceEnd;

    while (cursor.isBefore(endDate) || cursor.isSame(endDate, "day")) {
      // 날짜 별로 반복 (조회 기간)
      if (cursor.isAfter(repeatEnd, "day")) break;

      const shouldInclude = (() => {
        // boolean
        if (repeat.type === "daily") {
          const diff = cursor.diff(dayjs(startDateTime), "day");
          return diff % repeat.interval === 0;
        }

        if (repeat.type === "weekly") {
          return repeat.weekDays?.includes(cursor.day());
        }

        if (repeat.type === "monthly") {
          return cursor.date() === dayjs(startDateTime).date();
        }

        return false;
      })();

      if (shouldInclude) {
        instanceStart = cursor
          .hour(dayjs(startDateTime).hour())
          .minute(dayjs(startDateTime).minute());
        instanceEnd = instanceStart.add(
          dayjs(endDateTime).diff(startDateTime, "minute"),
          "minute"
        );

        if (instanceStart.isBefore(endDate) && instanceEnd.isAfter(startDate)) {
          expandedRepeats.push({
            ...item,
            startDateTime: instanceStart.toDate(),
            endDateTime: instanceEnd.toDate(),
          });
        }
      }

      // 날짜 증가
      if (["daily", "weekly", "monthly"].includes(repeat.type)) {
        cursor = cursor.add(1, "day");
      }
    }
  }

  const allSchedules = [...normalSchedules, ...expandedRepeats];
  res.json(allSchedules);
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
