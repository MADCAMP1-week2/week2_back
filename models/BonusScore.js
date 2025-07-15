const mongoose = require("mongoose");

const dailyBonusSchema = new mongoose.Schema({
  date: { type: Date, required: true }, // 해당 날짜 (KST 기준 startOf day)
  bonus: { type: Number, default: 0 }, // 해당 날짜 보너스 점수
});

const bonusScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  weekStart: {
    type: Date,
    required: true, // 매주 월요일 00:00:00 (KST 기준)
    index: true,
  },
  totalBonus: { type: Number, default: 0 }, // 주간 누적 점수
  breakdown: [dailyBonusSchema], // 일별 보너스 상세 내역
  updatedAt: { type: Date, default: Date.now },
});

bonusScoreSchema.index({ user: 1, weekStart: -1 }, { unique: true });

module.exports = mongoose.model("BonusScore", bonusScoreSchema);
