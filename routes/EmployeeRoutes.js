const express = require("express");
const router = express.Router();
const employeeCtrl = require("../controllers/EmployeeController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminCheckMiddleware = require("../middlewares/adminCheckMiddleware");
const upload = require("../middlewares/multerToS3");
const employeeChecker = require("../middlewares/employeeChecker");

router.post("/create", authMiddleware, adminCheckMiddleware, upload.single('image'), employeeCtrl.CreateEmployee);
router.get("/get-all", authMiddleware, employeeChecker, employeeCtrl.GetAllEmployees )
router.get("/get/:id", authMiddleware, employeeCtrl.GetEmployee);
router.put("/update", authMiddleware, adminCheckMiddleware, upload.single('image'), employeeCtrl.UpdateEmployee)
router.put("/change-password", authMiddleware,employeeChecker, employeeCtrl.ChangePassword);
router.put("/deactivate", authMiddleware, adminCheckMiddleware, employeeCtrl.DeactivateEmployee)

// router.get("/get-assigned-works/:id", authMiddleware, employeeCtrl.GetAssignedWorks)
router.get("/get-assigned-works/:id", authMiddleware, employeeChecker, employeeCtrl.RetrieveWorks)

router.get("/get-task-metrics/:id", authMiddleware, employeeChecker, employeeCtrl.GetEmployeeTaskMetrics)

router.get("/get-assigned-projects/:id", authMiddleware, employeeChecker, employeeCtrl.GetMyProjectTasks)

router.put("/assign-work", authMiddleware, employeeChecker, employeeCtrl.WorkAssign)

module.exports = router;