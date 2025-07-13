const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  date:       { type: Date,   required: true },         // 00:00 of that day
  startTime:  { type: String, required: true },         // “HH:mm”  (보관만)
  endTime:    { type: String, required: true },
  owner:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

scheduleSchema.index({ owner: 1, date: 1 });            // 월간·주간 범위 쿼리용

module.exports = mongoose.model('Schedule', scheduleSchema);
