const router = require("express").Router();
const projectCtrl = require("../controllers/projectController");
const { authenticateAccessToken } = require("../middlewares/authMiddleware");

router.post("/", authenticateAccessToken, projectCtrl.createProject);
router.get("/", authenticateAccessToken, projectCtrl.getMyProjects);

router.patch("/:id", authenticateAccessToken, projectCtrl.updateProjectInfo);
router.patch("/:id/members", authenticateAccessToken, projectCtrl.updateProjectMembers);
router.delete("/:id", authenticateAccessToken, projectCtrl.deleteProject);

module.exports = router;
