const express = require("express");
const router = express.Router();
const studentCtrl = require("../controllers/StudentController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminCheckMiddleware = require("../middlewares/adminCheckMiddleware");
const upload = require("../middlewares/multerToS3");
const employeeChecker = require("../middlewares/employeeChecker");

router.post("/create",  employeeChecker, upload.single('image'), studentCtrl.CreateStudent);
router.get("/get-all",  employeeChecker, studentCtrl.GetAllStudents )
router.get("/get/:id",  studentCtrl.GetStudent);
router.put("/update/:id",  adminCheckMiddleware, upload.single('image'), studentCtrl.UpdateStudent)
router.put("/change-password",  studentCtrl.ChangePassword);

router.get("/get-application/:id",  studentCtrl.GetMyApplication)

router.get("/get-my-applications/:id",  studentCtrl.GetAllOfMyApplications)

router.put("/deactivate/:id",  adminCheckMiddleware, studentCtrl.DeactivateStudent)

// router.get('/followup', employeeChecker, studentCtrl.getFollowups);
router.get('/followup', employeeChecker, studentCtrl.getManyFollowupDocs);
// router.get('/followup/:id', employeeChecker, studentCtrl.getSingleFollowup);
router.get('/followup/:id', employeeChecker, studentCtrl.getOneFollowupDoc);
router.put('/followup', employeeChecker, studentCtrl.updateFollowup);


module.exports = router;