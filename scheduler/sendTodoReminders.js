const cron = require("node-cron");
const admin = require("../utils/firebase");
const Todo = require("../models/Todo");
const User = require("../models/User");
const dayjs = require("dayjs");
dayjs.locale("ko");

cron.schedule("0 9 * * *", async () => {
  const today = dayjs().startOf("day");
  const targetDates = [
    today.add(0, "day"),
    today.add(1, "day"),
    today.add(2, "day"),
    today.add(3, "day"),
  ].map((d) => d.format("YYYY-MM-DD"));

  const todos = await Todo.find({
    deadline: { $in: targetDates },
    completed: false,
  }).populate("owner");

  for (const todo of todos) {
    const user = todo.owner;
    if (!user.fcmToken) continue;

    const daysLeft = dayjs(todo.deadline).diff(today, "day");
    const title = `[D-${daysLeft}] ${todo.title}`;
    const body =
      daysLeft === 0
        ? `오늘 마감: ${todo.title}`
        : `${daysLeft}일 후 마감 예정: ${todo.title}`;

    try {
      await admin.messaging().send({
        token: user.fcmToken,
        notification: {
          title,
          body,
        },
        android: {
          notification: {
            channelId: "default",
            sound: "default",
          },
        },
      });
      console.log(`🔔 푸시 전송: ${title} → ${user.email}`);
    } catch (err) {
      console.error("❌ 푸시 전송 실패:", err);
    }
  }
});
