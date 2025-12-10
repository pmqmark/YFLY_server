const express = require("express");
const router = express.Router();
const applicationCtrl = require("../controllers/ApplicationController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminCheckMiddleware = require("../middlewares/adminCheckMiddleware");
const upload = require("../middlewares/multerToDO");
const employeeChecker = require("../middlewares/employeeChecker");

router.post("/create", employeeChecker, applicationCtrl.CreateApplication);
router.get("/get-all", employeeChecker, applicationCtrl.GetAllApplications);
router.get("/get/:id", applicationCtrl.GetApplication);
router.put("/update", employeeChecker, applicationCtrl.UpdateApplication);
router.delete(
  "/delete/:id",
  employeeChecker,
  applicationCtrl.DeleteApplication
);

router.post(
  "/upload-document/:id/:name",
  applicationCtrl.CheckDocName,
  upload.single("document"),
  applicationCtrl.UploadDoc
);
router.get("/get-document/:id/:name", applicationCtrl.GetDocument);
router.put("/delete-document/:id/:name", applicationCtrl.DeleteDocument);
router.put(
  "/update-document/:id/:name",
  upload.single("document"),
  applicationCtrl.UpdateDocument
);

router.put("/phase-change/:id", employeeChecker, applicationCtrl.PhaseChange);

module.exports = router;
