const express = require("express");
const router = express.Router();
const employeeCtrl = require("../controllers/EmployeeController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminCheckMiddleware = require("../middlewares/adminCheckMiddleware");
const upload = require("../middlewares/multerToS3");
const employeeChecker = require("../middlewares/employeeChecker");
const notifyCtrl = require("../controllers/NotificationController");

router.post("/create",  adminCheckMiddleware, upload.single('image'), employeeCtrl.CreateEmployee);
router.get("/get-all",  employeeChecker, employeeCtrl.GetAllEmployees )
router.get("/get/:id",  employeeCtrl.GetEmployee);
router.put("/update/:id",  adminCheckMiddleware, upload.single('image'), employeeCtrl.UpdateEmployee)
router.put("/change-password", employeeChecker, employeeCtrl.ChangePassword);
router.put("/deactivate/:id",  adminCheckMiddleware, employeeCtrl.DeactivateEmployee)

router.get("/get-assigned-works/:id",  employeeChecker, employeeCtrl.RetrieveWorks)

router.get("/get-task-metrics/:id",  employeeChecker, employeeCtrl.GetEmployeeTaskMetrics)

router.get("/get-assigned-projects/:id",  employeeChecker, employeeCtrl.GetMyProjectTasks)

router.put("/assign-work",  employeeChecker, employeeCtrl.WorkAssign)


router.get('/notification/all/:id', employeeChecker, notifyCtrl.getUserNotifications)
router.get('/notification/:id', employeeChecker, notifyCtrl.getSingleNotification)
router.put('/notification/status', employeeChecker, notifyCtrl.alterReadStatus)

router.get("/select-employee",  employeeChecker, employeeCtrl.SelectEmployee)

module.exports = router;