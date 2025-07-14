const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// owner를 members에 자동 추가하는 pre-save 훅
projectSchema.pre("save", function (next) {
  if (this.owner && !this.members.includes(this.owner)) {
    this.members.push(this.owner);
  }
  next();
});

module.exports = mongoose.model("Project", projectSchema);
