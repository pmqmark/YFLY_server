const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/AuthController")

router.post("/login", authCtrl.Login);
router.get("/refresh-token", authCtrl.regenerateAccessToken);
router.get("/logout", authCtrl.Logout);

router.post("/sent-otp", authCtrl.SendOTP);
router.post("/verify-otp", authCtrl.VerifyOTP);

module.exports = router;