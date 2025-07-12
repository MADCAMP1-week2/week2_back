const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");

// 로그인
exports.login = async (req, res) => {
  const { id, password, deviceId } = req.body;
  const userAgent = req.get("user-agent");
  const ip = req.ip;

  try {
    const user = await User.findOne({ id });
    if (!user || !deviceId || !(await user.validatePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials or there's no device ID" });
    }

    await RefreshToken.deleteMany({
      userId: user._id,
      deviceId: deviceId
    });

    const accessToken = generateAccessToken(user, deviceId);
    const refreshToken = generateRefreshToken(user, deviceId);

    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      deviceId: deviceId,
      userAgent,
      ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({
      accessToken,
      refreshToken,
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
  const { id } = req.query;
  console.log(id);
  try {
    const exists = await User.findOne({ id });
    res.json({ available: !exists });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

// 토큰 재발급
exports.refreshToken = async (req, res) => {
  const {refreshToken} = req.body;
  const userAgent = req.get("user-agent");
  const ip = req.ip;

  if (!refreshToken) return res.sendStatus(401);

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return res.sendStatus(403);
  }
  const deviceId = payload.deviceId;

  try {
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) return res.sendStatus(403);

    await storedToken.deleteOne();

    const user = await User.findById(payload.userId);
    if (!user) return res.sendStatus(404);

    const newAccessToken = generateAccessToken(user, deviceId);
    const newRefreshToken = generateRefreshToken(user, deviceId);

    await RefreshToken.create({
      token: newRefreshToken,
      userId: user._id,
      deviceId: deviceId,
      userAgent,
      ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
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

exports.logout = async (req, res) => {
  const userId = req.user.userId;
  const deviceId = req.user.deviceId;

  try {
    await RefreshToken.deleteOne({ userId, deviceId });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

exports.logoutAllDevices = async (req, res) => {
  const userId = req.user.userId; 

  try {
    await RefreshToken.deleteMany({ userId });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

exports.listActiveDevices = async (req, res) => {
  try {
    const userId = req.user.userId;

    const tokens = await RefreshToken.find({ userId })
      .sort({ createdAt: -1 });

    const deviceList = tokens.map(token => ({
      id: token._id,
      ip: token.ip,
      deviceId: token.deviceId,
      userAgent: token.userAgent,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
    }));

    res.json({ devices: deviceList });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

exports.register = async (req, res) => {
  const { id, nickname, password } = req.body;

  if (!id || !nickname || !password) {
    return res.status(400).json({ message: "모든 필드를 입력해주세요." });
  }

  try {
    // id 중복 검사
    const existingUser = await User.findOne({ id });
    if (existingUser) {
      return res.status(409).json({ message: "이미 존재하는 ID입니다." });
    }

    // 유저 생성 및 비밀번호 설정
    const user = new User({ id, nickname });
    await user.setPassword(password);
    await user.save();

    res.status(201).json({
      message: "회원가입 성공",
      user: {
        id: user.id,
        nickname: user.nickname,
      },
    });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};