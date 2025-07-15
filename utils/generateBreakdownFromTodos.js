const dayjs = require("../utils/dayjs"); // 커스텀 dayjs

function generateBreakdownFromTodos(todos, baseDate = dayjs()) {
  let scheduledCount = 0;
  let deadlineCount = 0;
  let overdueCount = 0;
  let weightedDeadlineScore = 0;
  let totalDifficultyScore = 0;

  todos.forEach((todo) => {
    const difficulty = todo.difficulty ?? 3;
    totalDifficultyScore += difficulty;

    if (todo.deadline) {
      deadlineCount++;

      const daysLeft = dayjs(todo.deadline).diff(baseDate, "day");

      if (daysLeft < 0 && !todo.completed) {
        overdueCount++;
      }

      if (!todo.completed) {
        weightedDeadlineScore += Math.max(0, 30 - daysLeft * 5);
      }
    } else if (todo.date) {
      scheduledCount++;
    }
  });

  return {
    scheduledCount,
    deadlineCount,
    overdueCount,
    weightedDeadlineScore,
    totalDifficultyScore,
    calculatedAt: new Date(),
  };
}

module.exports = generateBreakdownFromTodos;
