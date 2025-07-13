const express = require("express");
const router = express.Router();
const {
  createCategory,
  getMyCategories,
} = require("../controllers/categoryController");
const { authenticateAccessToken } = require("../middlewares/authMiddleware");

router.post("/", authenticateAccessToken, createCategory);
router.get("/", authenticateAccessToken, getMyCategories);

module.exports = router;
