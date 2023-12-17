const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const commentCtrl = require("../controllers/CommentController");

router.get("/get-all/:id", authMiddleware, commentCtrl.GetComments)
router.post("/add", authMiddleware, commentCtrl.AddComment)


module.exports = router;