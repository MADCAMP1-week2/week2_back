const jwt = require("jsonwebtoken");

function generateAccessToken(user, deviceId) {
  return jwt.sign(
    { userId: user._id, deviceId: deviceId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );
}

function generateRefreshToken(user, deviceId) {
  return jwt.sign(
    { userId: user._id, deviceId: deviceId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
}

module.exports = { generateAccessToken, generateRefreshToken };
