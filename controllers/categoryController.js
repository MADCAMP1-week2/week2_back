const Category = require("../models/Category");

// 개인 카테고리 생성 (TODO에만 쓸지 일정이랑 같이 쓸지는 모름)
exports.createCategory = async (req, res) => {
  try {
    const { name, color, isPublic } = req.body;
    const userId = req.user.userId;

    const newCategory = new Category({
      userId,
      name,
      color,
      isPublic,
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    console.error("카테고리 생성 오류:", err);
    res.status(500).json({ message: "카테고리 생성에 실패했습니다." });
  }
};

// 개인 카테고리 목록 조회
exports.getMyCategories = async (req, res) => {
  try {
    const userId = req.user.userId;
    const categories = await Category.find({ userId }); // 본인 것만 조회
    res.status(200).json(categories);
  } catch (err) {
    console.error("카테고리 목록 조회 오류:", err);
    res.status(500).json({ message: "카테고리 목록을 불러오지 못했습니다." });
  }
};

// 개인 카테고리 수정

// 개인 카테고리 삭제
