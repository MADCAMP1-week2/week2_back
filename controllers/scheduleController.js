const Schedule = require("../models/Schedule");
const Project = require("../models/Project");
const asyncHandler = require("../middlewares/asyncHandler");
const dayjs = require("dayjs");

// 다음 주차 계산하는 함수
const getNextRepeatDate = (baseDate, repeat) => {
  const base = dayjs(baseDate);

  if (repeat.type === "daily") {
    return base.add(repeat.interval, "day");
  }

  if (repeat.type === "weekly") {
    const nextDayIndex = repeat.weekDays
      .map((d) => (d + 7 - base.day()) % 7)
      .filter((diff) => diff > 0)
      .sort((a, b) => a - b)[0];

    return base.add(nextDayIndex || 7, "day");
  }

  if (repeat.type === "monthly") {
    return base.add(1, "month");
  }

  return base;
};

// GET /api/schedules?start=YYYY-MM-DD&end=YYYY-MM-DD&projectId=12345678
exports.getSchedules = asyncHandler(async (req, res) => {
  const { start, end, projectId } = req.query;
  const owner = req.user.userId;

  if (!(start && end)) {
    return res.status(400).json({ message: "시작일과 종료일을 제공해주세요." });
  }

  const startDate = dayjs(start).startOf("day");
  const endDate = dayjs(end).endOf("day");

  let projectFilter = [];

  if (projectId) {
    // 쿼리로 받은 특정 프로젝트 일정만
    projectFilter = [{ project: projectId }];
  } else {
    // 로그인한 사용자가 속한 프로젝트 목록 가져오기
    const userProjects = await Project.find({ members: owner })
      .select("_id")
      .lean();
    const userProjectIds = userProjects.map((p) => p._id);

    projectFilter = [{ project: { $in: userProjectIds } }];
  }

  // 1. 반복 없는 일정
  const normalSchedules = await Schedule.find({
    $or: [
      { owner }, // 본인 일정
      ...projectFilter, // 본인이 속한 프로젝트의 일정
    ],
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
    $or: [
      { owner }, // 본인 일정
      ...projectFilter, // 본인이 속한 프로젝트의 일정
    ],
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
          return (
            cursor.startDateTime() === dayjs(startDateTime).startDateTime()
          );
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
  const { action, updateData } = req.body; // action 항목 추가: "only_this_date" | "from_this_date" | "all"

  if (!id || !updateData.startDateTime || !updateData.endDateTime || !action) {
    return res.status(400).json({ message: "필수 파라미터가 없습니다." });
  }

  const targetStartDate = dayjs(updateData.startDateTime);
  const targetEndDate = dayjs(updateData.endDateTime);

  const sched = await Schedule.findOne({ _id: id, owner: owner });
  if (!sched)
    return res
      .status(404)
      .json({ message: "요청하신 일정을 찾을 수 없습니다." });

  if (sched.repeat.type === "none") {
    const { _id, ...restUpdateData } = updateData;
    Object.assign(sched, restUpdateData);
    await sched.save();
    return res.json(sched);
  }

  const newRepeatEnd = targetStartDate.subtract(1, "day").toDate();
  const originalRepeatEnd = sched.repeat.endDate;

  switch (action) {
    case "only_this_date": {
      if (
        originalRepeatEnd === null ||
        dayjs(originalRepeatEnd).isAfter(targetEndDate)
      ) {
        // 기존 일정 종료일 변경
        sched.repeat.endDate = newRepeatEnd;
        await sched.save();
      }

      // 새로운 미반복 일정 (이 날짜에 수정 내용 반영)
      const editedOneTimeSched = {
        ...updateData,
        owner,
        _id: undefined,
        repeat: { type: "none" },
      };
      const savedEditedSched = await Schedule.create(editedOneTimeSched);

      // 새로운 반복 일정 (date를 다음 반복 날짜로 설정)
      const nextStartDate = getNextRepeatDate(targetStartDate, sched.repeat);
      const nextEndDate = nextStartDate.add(
        dayjs(sched.endDateTime).diff(sched.startDateTime, "minute"),
        "minute"
      );

      const newRepeatSched = {
        ...sched.toObject(),
        _id: undefined,
        startDateTime: nextStartDate.toDate(),
        endDateTime: nextEndDate.toDate(),
        repeat: { ...sched.repeat.toObject(), endDate: originalRepeatEnd },
      };

      const savedRepeatSched = await Schedule.create(newRepeatSched);

      return res.status(200).json({
        editedSched: savedEditedSched,
        nextRepeatSched: savedRepeatSched,
      });
    }
    case "from_this_date": {
      if (
        originalRepeatEnd === null ||
        dayjs(originalRepeatEnd).isAfter(targetEndDate)
      ) {
        // 기존 반복 일정 종료
        sched.repeat.endDate = newRepeatEnd;
        await sched.save();
      }

      // 새로운 반복 일정 생성 (수정 내용 반영, startDateTime, endDateTime은 새로 설정됨)
      const newRepeatSched = {
        ...updateData,
        owner,
        _id: undefined,
      };
      const savedNewRepeatSched = await Schedule.create(newRepeatSched);

      return res.status(200).json(savedNewRepeatSched);
    }
    case "all": {
      // 그냥 다 수정
      const { _id, ...restUpdateData } = updateData;
      Object.assign(sched, restUpdateData);
      await sched.save();
      return res.json(sched);
    }

    default:
      return res.status(400).json({ message: "알 수 없는 action 타입입니다." });
  }
});

exports.deleteSchedule = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const { id } = req.params; // schedule ID
  const { action, startDateTime } = req.body; // action 항목 추가: "only_this_date" | "from_this_date" | "all"

  if (!id || !startDateTime || !action) {
    return res.status(400).json({ message: "필수 파라미터가 없습니다." });
  }
  const targetDate = dayjs(startDateTime).startOf("day");
  const sched = await Schedule.findOne({ _id: id, owner: owner });

  if (!sched) {
    return res
      .status(404)
      .json({ message: "요청하신 일정을 찾을 수 없습니다." });
  }

  // 반복 없는 일정은 그냥 삭제
  if (sched.repeat.type === "none") {
    await sched.deleteOne();
    return res.status(200).json({ message: "삭제 완료 (반복 없음)" });
  }

  const originalRepeatEnd = sched.repeat.endDate;
  const newRepeatEnd = targetDate.subtract(1, "day").toDate();

  switch (action) {
    case "only_this_date": {
      // 기존 반복 일정 종료
      if (!originalRepeatEnd || dayjs(originalRepeatEnd).isAfter(targetDate)) {
        sched.repeat.endDate = newRepeatEnd;
        await sched.save();
      }
      // 새로운 반복 일정 (date를 다음 반복 날짜로 설정)
      const nextStartDate = getNextRepeatDate(targetDate, sched.repeat);
      const nextEndDate = nextStartDate.add(
        dayjs(sched.endDateTime).diff(sched.startDateTime, "minute"),
        "minute"
      );
      const newRepeatSched = {
        ...sched.toObject(),
        _id: undefined,
        startDateTime: nextStartDate.toDate(),
        endDateTime: nextEndDate.toDate(),
        repeat: { ...sched.repeat.toObject(), endDate: originalRepeatEnd },
      };
      const savedRepeatSched = await Schedule.create(newRepeatSched);

      return res.status(200).json({
        message: "해당 날짜 인스턴스만 삭제 완료",
        nextRepeatSched: savedRepeatSched,
      });
    }
    case "from_this_date": {
      // 기존 반복 종료일 변경
      if (!originalRepeatEnd || dayjs(originalRepeatEnd).isAfter(targetDate)) {
        sched.repeat.endDate = newRepeatEnd;
        await sched.save();
      }
      return res.status(200).json({ message: "이 날짜 이후 반복 삭제 완료" });
    }
    case "all": {
      await sched.deleteOne();
      return res.status(200).json({ message: "전체 반복 삭제 완료" });
    }
    default:
      return res.status(400).json({ message: "알 수 없는 action 타입입니다." });
  }
});
