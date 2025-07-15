const mongoose = require("mongoose");

const busynessScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  date: { type: Date, required: true, index: true }, // 기준 날짜
  score: { type: Number, required: true },
  breakdown: {
    scheduledCount: Number, // date만 있는 할 일 개수
    deadlineCount: Number, // deadline 있는 할 일 개수
    overdueCount: Number, // 마감일이 지난 할 일 수
    weightedDeadlineScore: Number, // deadline 있는 할 일: 남은 기한 가중치 합산 점수
    totalDifficultyScore: Number, // difficulty(1~5) 합계
    calculatedAt: { type: Date, default: Date.now },
  },
});

busynessScoreSchema.index({ user: 1, date: -1 }, { unique: true });
// user는 오름차순(1), date는 내림차순(-1), 하루 1개 제한

module.exports = mongoose.model("BusynessScore", busynessScoreSchema);
