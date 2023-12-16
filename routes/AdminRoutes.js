const express = require("express");
const router = express.Router();
const adminCtrl = require("../controllers/AdminController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminCheckMiddleware = require("../middlewares/adminCheckMiddleware");

router.get("/get/:id", authMiddleware,adminCheckMiddleware, adminCtrl.GetAdmin);
router.put("/update", authMiddleware,adminCheckMiddleware, adminCtrl.UpdateAdmin);
router.put("/change-password", authMiddleware,adminCheckMiddleware, adminCtrl.ChangePassword);
router.get("/get-application-metrics", authMiddleware, adminCheckMiddleware, adminCtrl.GetApplicationMetrics)

module.exports = router;