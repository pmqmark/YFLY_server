const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/AuthController")

router.post("/login", authCtrl.Login);
router.get("/refresh-token", authCtrl.regenerateAccessToken);
router.get("/logout", authCtrl.Logout);

router.post("/send-otp", authCtrl.SendOTP);
router.post("/verify-mail", authCtrl.VerifyMail);

module.exports = router;