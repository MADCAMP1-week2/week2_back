const Category = require("../models/Category");
const asyncHandler = require("../middlewares/asyncHandler");

// 카테고리 생성
exports.createCategory = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const newCategory = await Category.create({ ...req.body, owner });
  res.status(201).json(newCategory);
});

// 카테고리 목록 조회
exports.getMyCategories = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const categories = await Category.find({ owner }); // 본인 것만 조회
  res.status(200).json(categories);
});

// 카테고리 수정
exports.updateCategory = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  const { id } = req.params;
  const cat = await Category.findOneAndUpdate({ _id: id, owner }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!cat) return res.status(404).json({ message: "Category not found" });
  res.json(cat);
});

// 카테고리 삭제
exports.deleteCategory = asyncHandler(async (req, res) => {
  const owner = req.user.userId;
  await Category.findOneAndDelete({ _id: req.params.id, owner });
  res.status(204).end();
});
