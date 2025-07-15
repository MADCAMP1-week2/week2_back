const cron = require("node-cron");
const User = require("../models/User");
const calculateAndSaveBusynessScore = require("../utils/calculateBusynessScore");

cron.schedule("0 0 9 * * *", async () => {
  console.log("🔔 바쁨지수 계산 시작 (매일 오전 9시)");
  const today = dayjs().startOf("day");

  try {
    const users = await User.find({}); // 모든 사용자 조회
    for (const user of users) {
      await calculateAndSaveBusynessScore(user._id, today);
    }
    console.log("✅ 바쁨지수 계산 완료");
  } catch (err) {
    console.error("❌ 바쁨지수 스케줄러 오류:", err);
  }
});
