const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");

// 로그인
exports.login = async (req, res) => {
  const { id, password } = req.body;
  const userAgent = req.get("user-agent");
  const ip = req.ip;

  try {
    const user = await User.findOne({ id }); // 여기 주의: id → 실제 필드명 확인 필요 (ex: username, userId 등)
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      userAgent,
      ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

// 중복 검사 (username 기준)
exports.checkDuplicate = async (req, res) => {
  const { username } = req.query;
  try {
    const exists = await User.findOne({ username });
    res.json({ available: !exists });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

// 토큰 재발급
exports.refreshToken = async (req, res) => {
  const refreshTokenFromCookie = req.cookies.refreshToken;
  const userAgent = req.get("user-agent");
  const ip = req.ip;

  if (!refreshTokenFromCookie) return res.sendStatus(401);

  let payload;
  try {
    payload = jwt.verify(refreshTokenFromCookie, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return res.sendStatus(403);
  }

  try {
    const storedToken = await RefreshToken.findOne({ token: refreshTokenFromCookie });
    if (!storedToken) return res.sendStatus(403);

    await storedToken.deleteOne();

    const user = await User.findById(payload.userId);
    if (!user) return res.sendStatus(404);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      token: newRefreshToken,
      userId: user._id,
      userAgent,
      ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};
