const asyncHandler = require("../middlewares/asyncHandler");
const BonusScore = require("../models/BonusScore");
const calculateAndSaveBonusScore = require("../utils/calculateBonusScore");
const dayjs = require("../utils/dayjs");

// 보너스 점수 조회
// GET /api/bonus/YYYY-MM-DD
exports.getBonusOfWeek = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { date } = req.params;

  if (!date) {
    return res
      .status(400)
      .json({ message: "날짜를 YYYY-MM-DD 형식으로 입력해주세요." });
  }

  const parsedDate = dayjs(date);
  if (!parsedDate.isValid()) {
    return res.status(400).json({ message: "유효하지 않은 날짜입니다." });
  }

  const weekStart = parsedDate.tz().startOf("week").toDate();

  const bonusDoc = await BonusScore.findOne({
    user: userId,
    weekStart: weekStart,
  });

  if (!bonusDoc) {
    return res
      .status(404)
      .json({ message: "이번 주 보너스 점수 기록이 없습니다." });
  }

  res.status(200).json(bonusDoc);
});

// 보너스 점수 랭킹 조회
// GET /api/bonus/rank/YYYY-MM-DD
exports.getBonusRankOfWeek = asyncHandler(async (req, res) => {
  const { date } = req.params;

  if (!date) {
    return res
      .status(400)
      .json({ message: "날짜를 YYYY-MM-DD 형식으로 입력해주세요." });
  }

  const parsedDate = dayjs(date);
  if (!parsedDate.isValid()) {
    return res.status(400).json({ message: "유효하지 않은 날짜입니다." });
  }

  const weekStart = parsedDate.tz().startOf("week").toDate();

  // 해당 주의 보너스 점수들을 전체 유저 대상으로 조회
  const weeklyRanks = await BonusScore.find({ weekStart })
    .sort({ totalBonus: -1 }) // 총점 기준 내림차순
    .populate("user", "nickname") // 유저 정보 일부만 불러오기 (원한다면)
    .lean();

  if (weeklyRanks.length === 0) {
    return res
      .status(404)
      .json({ message: "이번 주 보너스 점수 데이터가 없습니다." });
  }

  // 랭킹 정보에 순위 추가
  const ranked = weeklyRanks.map((doc, index) => ({
    rank: index + 1,
    user: doc.user,
    totalBonus: doc.totalBonus,
  }));

  res.status(200).json(ranked);
});
