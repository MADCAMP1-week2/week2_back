const mongoose = require('mongoose');

const repeatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["none", "daily", "weekly", "monthly"],
    default: "none",
  },
  interval: {
    // daily 반복 시 n일 간격 (1이면 매일)
    type: Number,
    required: function () {
      return this.type === "daily";
    },
    min: 1,
  },
  weekDays: {
    // weekly 반복 시 반복 요일 배열, 0(일) ~ 6(토)
    type: [Number],
    required: function () {
      return this.type === "weekly";
    },
    validate: {
      validator: function (arr) {
        return arr.every((v) => v >= 0 && v <= 6);
      },
      message: "weekDays 값은 0~6 사이의 숫자여야 합니다.",
    },
  },
  endDate: {
    // 반복 종료일 (선택)
    type: Date,
    default: null,
  },
});

const todoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    deadline: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null, // null 일 경우 개인 TODO
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    difficulty: { type: Number, min: 1, max: 5 }, // 난이도는 1부터 5까지

    repeat: { type: repeatSchema, default: () => ({ type: "none" }) },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// “owner+deadline(dateOnly)” 복합 인덱스 → 날짜 범위 검색 빠르게
todoSchema.index({ owner: 1, deadline: 1 });

module.exports = mongoose.model('Todo', todoSchema);
