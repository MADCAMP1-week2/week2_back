const router = require("express").Router();
const todoCtrl = require("../controllers/todoController");
const { authenticateAccessToken } = require("../middlewares/authMiddleware");

router.get("/", authenticateAccessToken, todoCtrl.getTodos); // ?start=&end=
router.post("/", authenticateAccessToken, todoCtrl.createTodo);

router.patch("/:id", authenticateAccessToken, todoCtrl.updateTodo);
router.delete("/:id", authenticateAccessToken, todoCtrl.deleteTodo);

module.exports = router;
