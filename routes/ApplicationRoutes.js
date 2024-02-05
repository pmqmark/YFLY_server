const express = require("express");
const router = express.Router();
const applicationCtrl = require("../controllers/ApplicationController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminCheckMiddleware = require("../middlewares/adminCheckMiddleware");
const upload = require("../middlewares/multerToS3");
const employeeChecker = require("../middlewares/employeeChecker");

router.post("/create", authMiddleware, adminCheckMiddleware, applicationCtrl.CreateApplication);
router.get("/get-all", authMiddleware, employeeChecker, applicationCtrl.GetAllApplications);
router.get("/get/:id", authMiddleware, applicationCtrl.GetApplication);
router.put("/update", authMiddleware, employeeChecker, applicationCtrl.UpdateApplication);
router.delete("/delete/:id", authMiddleware, adminCheckMiddleware, applicationCtrl.DeleteApplication);

router.post("/upload-document/:id/:name", authMiddleware, applicationCtrl.CheckDocName, upload.single('document'), applicationCtrl.UploadDoc)
router.get("/get-document/:id/:name", authMiddleware, applicationCtrl.GetDocument);
router.put("/delete-document/:id/:name", authMiddleware, applicationCtrl.DeleteDocument);
router.put("/update-document/:id/:name", authMiddleware, upload.single('document'), applicationCtrl.UpdateDocument);

router.put("/phase-change/:id", authMiddleware, employeeChecker, applicationCtrl.PhaseChange);

module.exports = router;