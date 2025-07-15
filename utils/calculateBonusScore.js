const dayjs = require("../utils/dayjs");
const Todo = require("../models/Todo");
const BonusScore = require("../models/BonusScore");
const CompletedRepeatTodo = require("../models/CompletedRepeatTodo");

const calculateBonusScore = async (userId, date) => {
  const targetDate = dayjs(date).tz().startOf("day"); // 한국 기준
  const dateStr = targetDate.format("YYYY-MM-DD");

  // 1. 미반복 todos 가져오기
  const normalTodos = await Todo.find({
    owner: userId,
    "repeat.type": "none",
    completed: true,
    $or: [
      {
        $expr: {
          $and: [
            { $ne: ["$date", null] },
            { $eq: ["$deadline", null] },
            {
              $eq: [
                { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                dateStr,
              ],
            },
          ],
        },
      },
      {
        date: null,
        deadline: {
          $ne: null,
          $gte: targetDate.subtract(1, "day").endOf("day").toDate(),
        },
      },
    ],
  });

  // 2. 반복 todos 가져오기
  const completedRepeatTodos = await CompletedRepeatTodo.find({
    owner: userId,
    date: {
      $gte: dayjs(date).tz().startOf("day").toDate(),
      $lt: dayjs(date).tz().endOf("day").toDate(),
    },
  });

  const repeatTodoIds = completedRepeatTodos.map((item) => item.todo);
  const repeatTodos = await Todo.find({
    _id: { $in: repeatTodoIds },
  });

  const allCompletedTodos = [...normalTodos, ...repeatTodos];

  // 3. 보너스 점수 계산
  let dailyBonus = 0;

  allCompletedTodos.forEach((todo) => {
    const difficulty = todo.difficulty ?? 3;

    // 기본 점수: 난이도 점수
    dailyBonus += difficulty;

    if (todo.deadline) {
      const daysLeft = dayjs(todo.deadline).diff(targetDate, "day");
      dailyBonus += Math.max(0, 30 - daysLeft * 5); // 마감 기한 기반 점수
      if (daysLeft < 0) dailyBonus += 40; // 마감 지남
    } else if (todo.date) {
      dailyBonus += 5;
    }
  });

  // 4. weekStart (한국 기준 해당 주의 월요일 00:00)
  const weekStart = targetDate.startOf("week").toDate();

  // 5. 기존 BonusScore 문서 확인
  let bonusDoc = await BonusScore.findOne({
    user: userId,
    weekStart: weekStart,
  });

  if (!bonusDoc) {
    // 새로 생성
    bonusDoc = new BonusScore({
      user: userId,
      weekStart,
      totalBonus: 0,
      breakdown: [],
    });
  }

  // 6. 해당 날짜의 보너스 내역 존재 여부 확인
  const existing = bonusDoc.breakdown.find((b) =>
    dayjs(b.date).isSame(targetDate, "day")
  );

  if (existing) {
    // 기존 점수 수정
    bonusDoc.totalBonus -= existing.bonus;
    existing.bonus = dailyBonus;
  } else {
    // 새 일자 추가
    bonusDoc.breakdown.push({
      date: targetDate.toDate(),
      bonus: dailyBonus,
    });
  }

  bonusDoc.totalBonus += dailyBonus;
  bonusDoc.updatedAt = new Date();
  await bonusDoc.save();

  return {
    totalBonus: bonusDoc.totalBonus,
    dailyBonus,
    todosCount: allCompletedTodos.length,
  };
};

module.exports = calculateBonusScore;
