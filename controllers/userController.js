const User = require("../models/User");

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
