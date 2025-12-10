const express = require("express");
const router = express.Router();
const studentCtrl = require("../controllers/StudentController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminCheckMiddleware = require("../middlewares/adminCheckMiddleware");
const upload = require("../middlewares/multerToS3");
const uploadDO = require("../middlewares/multerToDO");
const employeeChecker = require("../middlewares/employeeChecker");

router.post(
  "/create",
  employeeChecker,
  upload.single("image"),
  studentCtrl.CreateStudent
);
router.get("/get-all", employeeChecker, studentCtrl.GetAllStudents);
router.get("/get/:id", studentCtrl.GetStudent);
router.put(
  "/update/:id",
  employeeChecker,
  upload.single("image"),
  studentCtrl.UpdateStudent
);
router.put("/change-password", studentCtrl.ChangePassword);

router.get("/get-application/:id", studentCtrl.GetMyApplication);

router.get("/get-my-applications/:id", studentCtrl.GetAllOfMyApplications);

router.put("/deactivate/:id", employeeChecker, studentCtrl.DeactivateStudent);

router.get("/followup", employeeChecker, studentCtrl.getManyFollowupDocs);
router.get("/followup/:id", employeeChecker, studentCtrl.getOneFollowupDoc);
router.put(
  "/followup",
  employeeChecker,
  uploadDO.array("attachments", 10),
  studentCtrl.updateFollowup
);

// Delete note from followup
router.delete(
  "/followup/:followupId/note/:noteId",
  employeeChecker,
  studentCtrl.deleteFollowupNote
);

// Delete attachment from followup
router.delete(
  "/followup/:followupId/attachment/:attachmentId",
  employeeChecker,
  studentCtrl.deleteFollowupAttachment
);

// Delete comment from followup
router.delete(
  "/followup/:followupId/comment/:commentId",
  employeeChecker,
  studentCtrl.deleteFollowupComment
);

router.get("/names", employeeChecker, studentCtrl.GetNamesOfAllStudents);

module.exports = router;
