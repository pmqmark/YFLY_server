const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const adminCheckMiddleware = require("../middlewares/adminCheckMiddleware");
const projectCtrl = require("../controllers/ProjectController");
const employeeChecker = require("../middlewares/employeeChecker");

router.post("/create",authMiddleware,adminCheckMiddleware, projectCtrl.CreateProject)
router.get("/get-all",authMiddleware,employeeChecker, projectCtrl.GetAllProjects)
router.get("/get/:id",authMiddleware, employeeChecker, projectCtrl.GetProject)
router.get("/get-task/:id",authMiddleware, employeeChecker, projectCtrl.GetATaskOfAProject)
router.put("/change-task-status",authMiddleware, employeeChecker, projectCtrl.ChangeTaskStatus)
router.delete("/delete/:id",authMiddleware,adminCheckMiddleware, projectCtrl.DeleteProject)

router.post("/add-task", authMiddleware,adminCheckMiddleware, projectCtrl.AddTask)
router.get("/get-all-tasks/:id", authMiddleware,employeeChecker, projectCtrl.GetAllTasksOfAProject)
router.delete("/delete-task/:id", authMiddleware,adminCheckMiddleware, projectCtrl.DeleteATask)
router.put("/update-task/:id", authMiddleware,employeeChecker, projectCtrl.UpdateTask)

router.put("/update", authMiddleware, adminCheckMiddleware, projectCtrl.UpdateProject)

router.put("/rework-task/:id", authMiddleware, adminCheckMiddleware, projectCtrl.ReworkTask)


router.get("/get-members/:id", authMiddleware, employeeChecker, projectCtrl.GetMembers)

module.exports = router;