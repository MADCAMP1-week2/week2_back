const Todo = require("../models/Todo");
const Project = require("../models/Project");
const CompletedRepeatTodo = require("../models/CompletedRepeatTodo");
const asyncHandler = require("../middlewares/asyncHandler");
const dayjs = require("../utils/dayjs"); // 커스텀 dayjs
const calculateAndSaveBusynessScore = require("../utils/calculateBusynessScore");
const calculateAndSaveBonusScore = require("../utils/calculateBonusScore");

// 바쁨 지수 계산 트리거 (비동기 처리)
const triggerBusynessRecalculation = (owner, context = "작업 후") => {
  const today = dayjs().startOf("day");
  calculateAndSaveBusynessScore(owner, today)
    .then(() => {
      console.log(`✅ ${context} 바쁨지수 재계산 완료`);
    })
    .catch((err) => {
      console.log(`❌ ${context} 바쁨지수 재계산 실패:`, err);
    });
};

// 보너스 점수 계산 트리거 (비동기 처리)
const triggerBonusRecalculation = (owner) => {
  const today = dayjs().startOf("day");
  calculateAndSaveBonusScore(owner, today)
    .then(() => {
      console.log(`✅ 보너스 점수 재계산 완료`);
    })
    .catch((err) => {
      console.log("❌ 보너스 점수 재계산 실패:", err);
    });
};

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

// GET /api/todos?today=YYYY-MM-DD&projectId=12345678
exports.getTodos = asyncHandler(async (req, res) => {
  const { today, projectId } = req.query;
  const owner = req.user.userId; // JWT 미들웨어가 넣어둠

  if (!today) {
    return res.status(400).json({ message: "날짜를 제공해주세요." });
  }

  const chosenDate = dayjs(today).startOf("day");

  // 필터 조건 구성
  let ownerProjectFilter = {};

  if (projectId) {
    // 특정 프로젝트의 내 투두만 가져옴
    ownerProjectFilter = { owner, project: projectId };
  } else {
    // 개인 프로젝트(null) 중 내 투두만 가져옴
    ownerProjectFilter = { owner };
  }

  // 1. 반복 없는 투두 (date, deadline)
  const normalTodos = await Todo.find({
    ...ownerProjectFilter,
    "repeat.type": "none",
    $or: [
      {
        $expr: {
          $and: [
            { $ne: ["$date", null] },
            { $eq: ["$deadline", null] },
            {
              $eq: [
                { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                today,
              ],
            },
          ],
        },
      },
      {
        date: null,
        deadline: {
          $ne: null,
          $gte: chosenDate.subtract(1, "day").endOf("day").toDate(),
        },
      },
    ],
  })
    .select("_id title deadline completed project category difficulty repeat")
    .populate("project", "name") // 프로젝트 이름
    .populate("category", "name color") // 카테고리 정보
    .lean();

  // 2. 반복 투두 (date)
  const repeatTodos = await Todo.find({
    ...ownerProjectFilter,
    "repeat.type": { $ne: "none" },
    date: { $lte: chosenDate.endOf("day").toDate() },
    $or: [
      { "repeat.endDate": null }, // 반복 종료 없거나
      {
        "repeat.endDate": {
          $gte: chosenDate.toDate(),
        },
      }, // 반복 종료가 chosenDate 이후
    ],
  })
    .select("_id title date completed project category difficulty repeat")
    .populate("project", "name") // 프로젝트 이름
    .populate("category", "name color") // 카테고리 정보
    .lean();

  // 3. 반복 투두 인스턴스화
  const expandedRepeats = [];

  for (const item of repeatTodos) {
    // 각 반복 투두
    const { repeat, date } = item;
    const baseDateStr = dayjs(date).utc().format("YYYY-MM-DD");
    const chosenDateStr = chosenDate.format("YYYY-MM-DD");

    const shouldInclude = () => {
      // boolean
      if (repeat.type === "daily") {
        const diff = dayjs(chosenDateStr).diff(dayjs(baseDateStr), "day");
        return diff % repeat.interval === 0 && diff >= 0;
      }

      if (repeat.type === "weekly") {
        return repeat.weekDays?.includes(chosenDate.day());
      }

      if (repeat.type === "monthly") {
        return chosenDate.date() === dayjs(baseDateStr).date();
        /* chosenDate.date() === dayjs(date).date(); */
      }

      return false;
    };

    if (shouldInclude()) {
      // ✅ 해당 날짜에 완료했는지 조회
      const isCompleted = await CompletedRepeatTodo.exists({
        todo: item._id,
        owner: owner,
        date: chosenDate.toDate(),
      });

      expandedRepeats.push({
        ...item,
        date: chosenDate.toDate(),
        completed: !!isCompleted,
      });
    }
  }

  const allTodos = [...normalTodos, ...expandedRepeats];
  res.json(allTodos);
});

exports.createTodo = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const { project } = req.body;

  // 본인 todo 먼저 생성
  const newTodo = await Todo.create({ ...req.body, owner });
  // 바쁨 지수 재계산
  triggerBusynessRecalculation(owner, "Todo 등록");

  // project todo인 경우, 멤버에게도 동일한 todo 생성
  if (project) {
    const targetProject = await Project.findById(project).lean();

    if (targetProject && targetProject.members?.length > 0) {
      // 본인을 제외한 멤버만 필터링
      const otherMembers = targetProject.members.filter(
        (memberId) => memberId.toString() !== owner
      );

      const sharedTodos = otherMembers.map((memberId) => ({
        ...req.body,
        owner: memberId,
      }));

      await Todo.insertMany(sharedTodos);

      // 각 멤버에 대해서도 바쁨 지수 재계산
      otherMembers.forEach((memberId) => {
        triggerBusynessRecalculation(memberId, "공유된 Todo 생성");
      });
    }
  }
  res.status(201).json(newTodo);
});

exports.updateTodo = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const { id } = req.params; // todo ID
  const { action, updateData } = req.body; // action 항목 추가: "only_this_date" | "from_this_date" | "all"

  if (!id || !updateData.date || !action) {
    return res.status(400).json({ message: "필수 파라미터가 없습니다." });
  }

  const targetDate = dayjs(updateData.date).startOf("day");
  const todo = await Todo.findOne({ _id: id, owner: owner });
  if (!todo)
    return res
      .status(404)
      .json({ message: "요청하신 TODO를 찾을 수 없습니다." });

  if (todo.repeat.type === "none") {
    const { _id, ...restUpdateData } = updateData;
    Object.assign(todo, restUpdateData);
    await todo.save();

    triggerBusynessRecalculation(owner, "Todo 수정 - 반복 없음");
    return res.json(todo);
  }

  const newEndDate = targetDate.subtract(1, "day").toDate();
  const originalEndDate = todo.repeat.endDate;

  switch (action) {
    case "only_this_date": {
      if (
        originalEndDate === null ||
        dayjs(originalEndDate).isAfter(targetDate)
      ) {
        // 기존 투두 종료일 변경
        todo.repeat.endDate = newEndDate;
        await todo.save();
      }

      // 새로운 미반복 투두 (오늘 날짜에 수정 내용 반영)
      const editedOneTimeTodo = {
        ...updateData,
        owner,
        _id: undefined,
        repeat: { type: "none" },
      };
      const savedEditedTodo = await Todo.create(editedOneTimeTodo);

      // 새로운 반복 투두 (date를 다음 반복 날짜로 설정)
      const nextDate = getNextRepeatDate(targetDate, todo.repeat);
      const newRepeatTodo = {
        ...todo.toObject(),
        _id: undefined,
        date: nextDate.toDate(),
        repeat: { ...todo.repeat.toObject(), endDate: originalEndDate },
      };
      const savedRepeatTodo = await Todo.create(newRepeatTodo);

      triggerBusynessRecalculation(owner, "only_this_date 수정");
      return res.status(200).json({
        editedTodo: savedEditedTodo,
        nextRepeatTodo: savedRepeatTodo,
      });
    }
    case "from_this_date": {
      if (
        originalEndDate === null ||
        dayjs(originalEndDate).isAfter(targetDate)
      ) {
        // 기존 반복 투두 종료
        todo.repeat.endDate = newEndDate;
        await todo.save();
      }
      // 새로운 반복 투두 생성 (수정 내용 반영, date는 새로 설정됨)
      const newRepeatTodo = {
        ...updateData,
        owner,
        _id: undefined,
      };
      const savedNewRepeatTodo = await Todo.create(newRepeatTodo);

      triggerBusynessRecalculation(owner, "from_this_date 수정");
      return res.status(200).json(savedNewRepeatTodo);
    }
    case "all": {
      // 그냥 다 수정
      const { _id, ...restUpdateData } = updateData;
      Object.assign(todo, restUpdateData);
      await todo.save();
      triggerBusynessRecalculation(owner, "전체 수정");
      return res.json(todo);
    }

    default:
      return res.status(400).json({ message: "알 수 없는 action 타입입니다." });
  }
});

exports.updateTodoCompletedStatus = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const { id } = req.params; // todo ID
  const { completed, date } = req.body;

  if (typeof completed !== "boolean") {
    return res
      .status(400)
      .json({ message: "completed 필드는 boolean이어야 합니다." });
  }

  const todo = await Todo.findOne({ _id: id, owner: owner });
  if (!todo) {
    return res.status(404).json({ message: "투두를 찾을 수 없습니다." });
  }

  // 반복 투두인 경우 date 필수
  if (todo.repeat.type !== "none") {
    if (!date) {
      return res
        .status(400)
        .json({ message: "반복 투두 완료 상태 변경 시 date가 필요합니다." });
    }

    const targetDate = dayjs(date).startOf("day").toDate();

    // 완료 처리: 완료 컬렉션에 추가 (중복 저장 방지)
    await CompletedRepeatTodo.updateOne(
      { todo: id, owner: owner, date: targetDate },
      completed
        ? { $setOnInsert: { todo: id, owner: owner, date: targetDate } }
        : {},
      { upsert: completed }
    );

    if (!completed) {
      // 완료 해제: 해당 문서 삭제
      await CompletedRepeatTodo.deleteOne({
        todo: id,
        owner: owner,
        date: targetDate,
      });
    }
  } else {
    // 일반 투두인 경우 Todo 컬렉션 completed 필드 업데이트
    todo.completed = completed;
    // await todo.save();
    await Todo.updateOne({ _id: id }, { $set: { completed } });
  }

  triggerBonusRecalculation(owner);
  res.json({ message: "완료 상태가 업데이트되었습니다." });
});

exports.deleteTodo = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const { id } = req.params; // todo ID
  const { action, date } = req.body; // action 항목 추가: "only_this_date" | "from_this_date" | "all"

  if (!id || !date || !action) {
    return res.status(400).json({ message: "필수 파라미터가 없습니다." });
  }
  const targetDate = dayjs(date).startOf("day");
  const todo = await Todo.findOne({ _id: id, owner: owner });

  if (!todo) {
    return res
      .status(404)
      .json({ message: "요청하신 TODO를 찾을 수 없습니다." });
  }

  // 반복 없는 투두는 그냥 삭제
  if (todo.repeat.type === "none") {
    await todo.deleteOne();
    triggerBusynessRecalculation(owner, "Todo 삭제 - 반복 없음");
    return res.status(200).json({ message: "삭제 완료 (반복 없음)" });
  }

  const originalEndDate = todo.repeat.endDate;
  const newEndDate = targetDate.subtract(1, "day").toDate();

  switch (action) {
    case "only_this_date": {
      // 기존 반복 투두 종료
      if (!originalEndDate || dayjs(originalEndDate).isAfter(targetDate)) {
        todo.repeat.endDate = newEndDate;
        await todo.save();
      }

      // 새로운 반복 투두 (date를 다음 반복 날짜로 설정)
      const nextDate = getNextRepeatDate(targetDate, todo.repeat);
      const newRepeatTodo = {
        ...todo.toObject(),
        _id: undefined,
        date: nextDate.toDate(),
        repeat: { ...todo.repeat.toObject(), endDate: originalEndDate },
      };
      const savedRepeatTodo = await Todo.create(newRepeatTodo);

      triggerBusynessRecalculation(owner, "only_this_date 삭제");
      return res.status(200).json({
        message: "해당 날짜 인스턴스만 삭제 완료",
        nextRepeatTodo: savedRepeatTodo,
      });
    }
    case "from_this_date": {
      // 기존 반복 종료일 변경
      if (!originalEndDate || dayjs(originalEndDate).isAfter(targetDate)) {
        todo.repeat.endDate = newEndDate;
        await todo.save();
      }
      triggerBusynessRecalculation(owner, "from_this_date 삭제");
      return res.status(200).json({ message: "이 날짜 이후 반복 삭제 완료" });
    }

    case "all": {
      await todo.deleteOne();
      triggerBusynessRecalculation(owner, "전체 삭제");
      return res.status(200).json({ message: "전체 반복 삭제 완료" });
    }

    default:
      return res.status(400).json({ message: "알 수 없는 action 타입입니다." });
  }
});
