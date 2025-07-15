const asyncHandler = require("../middlewares/asyncHandler");
const BusynessScore = require("../models/BusynessScore");
const calculateAndSaveBusynessScore = require("../utils/calculateBusynessScore");
const dayjs = require("../utils/dayjs");

// 점수 계산 테스트용: 로그인된 유저 대상으로 계산 실행
exports.testBusynessScore = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const date = dayjs().startOf("day");

  const result = await calculateAndSaveBusynessScore(userId, date);

  res.status(200).json({
    message: "바쁨지수 계산 완료",
    result,
  });
});

// 바쁨 지수 조회
// GET /api/busyness/YYYY-MM-DD
exports.getTodayBusyness = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { date } = req.params;
  console.log(date);
  const todayStart = dayjs(date).startOf("day").toDate();
  const todayEnd = dayjs(date).endOf("day").toDate();

  const todayScore = await BusynessScore.findOne({
    user: userId,
    date: {
      $gte: todayStart,
      $lte: todayEnd,
    },
  });

  if (!todayScore) {
    return res.status(404).json({ message: "오늘의 바쁨지수가 없습니다." });
  }

  res.status(200).json(todayScore);
});
