const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  deviceId: {
    type: String,
    required: true,
  },
  userAgent: { type: String },
  ip: { type: String },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
