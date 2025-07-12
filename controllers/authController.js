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
    if (!user || !(await user.validatePassword(password))) {
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
  const refreshToken = req.body.refreshToken;
  const userAgent = req.get("user-agent");
  const ip = req.ip;

  if (!refreshToken) return res.sendStatus(401);

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return res.sendStatus(403);
  }

  try {
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) return res.sendStatus(403);
    console.log("DB token:", storedToken.token);
    console.log("Client token:", refreshToken);
    console.log("Client token:", refreshToken);

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
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(204); // Already logged out

  try {
    // 해당 refreshToken 삭제
    await RefreshToken.findOneAndDelete({ token: refreshToken });

    // 쿠키 제거
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.sendStatus(204); // 성공적으로 로그아웃
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

exports.logoutAllDevices = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return res.sendStatus(403);
  }

  try {
    // 유저 ID 기준으로 모든 토큰 삭제
    await RefreshToken.deleteMany({ userId: payload.userId });

    // 쿠키도 삭제
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.sendStatus(204); // 성공적으로 로그아웃됨
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

exports.listActiveDevices = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return res.sendStatus(403);
  }

  try {
    const tokens = await RefreshToken.find({ userId: payload.userId })
      .sort({ createdAt: -1 });

    const deviceList = tokens.map(token => ({
      id: token._id,
      ip: token.ip,
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