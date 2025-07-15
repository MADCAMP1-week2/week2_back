const User = require("../models/User");
const asyncHandler = require("../middlewares/asyncHandler");

// id로 user 검색
// GET /api/users/search?id=...
exports.searchUsers = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: "검색어를 입력해주세요." });
  }

  try {
    const users = await User.find({
      id: { $regex: id, $options: "i" }, // 대소문자 구분 없이 부분 일치
    }).select("_id id nickname");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

// 클라이언트에서 FCM 토큰을 받아 저장
exports.updateFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;
  req.user.fcmToken = fcmToken;
  await req.user.save();
  res.status(200).json({ message: "FCM 토큰 저장 완료" });
});

