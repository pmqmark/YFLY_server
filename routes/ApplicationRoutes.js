const express = require("express");
const router = express.Router();
const applicationCtrl = require("../controllers/ApplicationController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminCheckMiddleware = require("../middlewares/adminCheckMiddleware");
const upload = require("../middlewares/multerToS3");

router.post("/create", authMiddleware, adminCheckMiddleware, applicationCtrl.CreateApplication);
router.get("/get-all", authMiddleware, adminCheckMiddleware, applicationCtrl.GetAllApplications);
router.get("/get/:id", authMiddleware, applicationCtrl.GetApplication);
router.put("/update", authMiddleware, applicationCtrl.UpdateApplication);
router.delete("/delete/:id", authMiddleware, adminCheckMiddleware, applicationCtrl.DeleteApplication);

router.post("/upload-document/:id/:name", authMiddleware, applicationCtrl.CheckDocName, upload.single('document'), applicationCtrl.UploadDoc)

router.get("/get-document/:id/:name", authMiddleware, applicationCtrl.GetDocument);

router.put("/delete-document/:id/:name", authMiddleware, applicationCtrl.DeleteDocument);

router.put("/update-document/:id/:name", authMiddleware, upload.single('document'), applicationCtrl.UpdateDocument);

module.exports = router;