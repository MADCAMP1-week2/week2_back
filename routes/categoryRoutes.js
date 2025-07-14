const router = require("express").Router();
const categoryCtrl = require("../controllers/categoryController");
const { authenticateAccessToken } = require("../middlewares/authMiddleware");

router.post("/", authenticateAccessToken, categoryCtrl.createCategory);
router.get("/", authenticateAccessToken, categoryCtrl.getMyCategories);

router.patch("/:id", authenticateAccessToken, categoryCtrl.updateCategory);
router.delete("/:id", authenticateAccessToken, categoryCtrl.deleteCategory);

module.exports = router;
