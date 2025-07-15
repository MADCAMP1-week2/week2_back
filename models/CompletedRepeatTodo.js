const mongoose = require("mongoose");

const completedRepeatTodoSchema = new mongoose.Schema(
  {
    todo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Todo",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date, // 반복 인스턴스의 해당 날짜
      required: true,
    },
  },
  { timestamps: true }
);

completedRepeatTodoSchema.index(
  { todo: 1, user: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "CompletedRepeatTodo",
  completedRepeatTodoSchema
);
