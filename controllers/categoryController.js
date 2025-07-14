const Category = require("../models/Category");
const Schedule = require("../models/Schedule");
const Todo = require("../models/Todo");
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
  const categoryId = req.params.id;

  // 해당 카테고리 존재 여부 확인
  const category = await Category.findOne({ _id: categoryId, owner });

  if (!category) {
    return res.status(404).json({ message: "카테고리를 찾을 수 없습니다." });
  }

  // 관련 schedule, todo 삭제
  await Schedule.deleteMany({ category: categoryId });
  await Todo.deleteMany({ category: categoryId });

  // 카테고리 삭제
  await Category.findOneAndDelete({
    _id: categoryId,
    owner,
  });

  res.status(204).end();
});
