const Todo = require("../models/Todo");
const asyncHandler = require("../middlewares/asyncHandler");
const dayjs = require("../utils/dayjs"); // 커스텀 dayjs

// GET /api/todos?today=YYYY-MM-DD
exports.getTodos = asyncHandler(async (req, res) => {
  const { today } = req.query;
  const owner = req.user.userId; // JWT 미들웨어가 넣어둠

  if (!today) {
    return res.status(400).json({ message: "날짜를 제공해주세요." });
  }

  const chosenDate = dayjs(today).startOf("day");

  // 1. 반복 없는 투두 (date, deadline)
  const normalTodos = await Todo.find({
    owner,
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
    owner,
    "repeat.type": { $ne: "none" } /*
    $expr: {
      $and: [
        { $ne: ["$date", null] },
        {
          $eq: [
            { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            today,
          ],
        },
      ],
    },*/,
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

  console.log(repeatTodos);
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
      expandedRepeats.push({
        ...item,
        date: chosenDate.toDate(),
      });
    }
  }

  const allTodos = [...normalTodos, ...expandedRepeats];
  res.json(allTodos);
});

exports.createTodo = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const newTodo = await Todo.create({ ...req.body, owner });
  res.status(201).json(newTodo);
});

exports.updateTodo = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const { id } = req.params;
  const todo = await Todo.findOneAndUpdate({ _id: id, owner }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!todo) return res.status(404).json({ message: "Todo not found" });
  res.json(todo);
});

exports.deleteTodo = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  await Todo.findOneAndDelete({ _id: req.params.id, owner });
  res.status(204).end();
});
