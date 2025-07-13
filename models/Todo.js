const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  deadline:    { type: Date,   required: true },
  completed:   { type: Boolean, default: false },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// “owner+deadline(dateOnly)” 복합 인덱스 → 날짜 범위 검색 빠르게
todoSchema.index({ owner: 1, deadline: 1 });

module.exports = mongoose.model('Todo', todoSchema);
