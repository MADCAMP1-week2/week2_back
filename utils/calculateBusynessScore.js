const dayjs = require("../utils/dayjs"); // 커스텀 dayjs
const Todo = require("../models/Todo");
const BusynessScore = require("../models/BusynessScore");
const generateBreakdownFromTodos = require("./generateBreakdownFromTodos");

const calculateAndSaveBusynessScore = async (userId, today) => {
  //const today = dayjs().startOf("day");
  const endDate = today.add(20, "day"); // 3주

  // 1. 해당 유저의 향후 3주간 할 일 가져오기 (반복 X)
  const normalTodos = await Todo.find({
    owner: userId,
    completed: false,
    "repeat.type": "none",
    $or: [
      { date: { $gte: today.toDate(), $lte: endDate.toDate() } },
      { deadline: { $gte: today.toDate(), $lte: endDate.toDate() } },
    ],
  }).lean();

  // 2. 해당 유저의 향후 3주간 할 일 가져오기 (반복 O)
  const repeatTodos = await Todo.find({
    owner: userId,
    "repeat.type": { $ne: "none" },
    date: { $lte: endDate.toDate() }, // 반복 시작은 endDate 이전
    $or: [
      { "repeat.endDate": null }, // 반복 종료 없거나
      { "repeat.endDate": { $gte: today.toDate() } }, // 반복 종료가 today 이후
    ],
  }).lean();

  // 3. 반복일정 인스턴스화
  const expandedRepeats = [];

  for (const item of repeatTodos) {
    // 각 반복 TODO
    const { repeat, date } = item;
    const baseDateStr = dayjs(date).utc().format("YYYY-MM-DD");
    const repeatEnd = repeat.endDate
      ? dayjs(repeat.endDate).endOf("day")
      : endDate;

    //    let cursor = dayjs(date);
    let cursor = dayjs(date).isAfter(today) ? dayjs(date) : today;

    //  let instanceStart, instanceEnd;

    while (cursor.isBefore(endDate) || cursor.isSame(endDate, "day")) {
      // 날짜 별로 반복 (3주)
      if (cursor.isAfter(repeatEnd, "day")) break;

      const shouldInclude = () => {
        // boolean
        if (repeat.type === "daily") {
          const diff = cursor.diff(dayjs(baseDateStr), "day");
          return diff % repeat.interval === 0;
        }

        if (repeat.type === "weekly") {
          return repeat.weekDays?.includes(cursor.day());
        }

        if (repeat.type === "monthly") {
          return cursor.date() === dayjs(baseDateStr).date();
        }

        return false;
      };

      if (shouldInclude()) {
        expandedRepeats.push({
          ...item,
          date: cursor.toDate(),
        });
      }

      // 날짜 증가
      if (["daily", "weekly", "monthly"].includes(repeat.type)) {
        cursor = cursor.add(1, "day");
      }
    }
  }

  const allTodos = [...normalTodos, ...expandedRepeats];

  // 4. breakdown 생성
  const breakdown = generateBreakdownFromTodos(allTodos, today);

  // 5. 총 점수 계산 (가중치 조합)
  const score =
    breakdown.totalDifficultyScore +
    breakdown.weightedDeadlineScore +
    breakdown.overdueCount * 40 +
    breakdown.scheduledCount * 5;

  // 6. 저장 또는 업데이트
  const saved = await BusynessScore.findOneAndUpdate(
    { user: userId, date: today.toDate() },
    {
      score,
      breakdown,
      calculatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return saved;
};

module.exports = calculateAndSaveBusynessScore;
