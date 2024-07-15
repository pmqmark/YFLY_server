const router = require("express").Router();
const dataCtrl = require("../controllers/DataController");
const adminCheckMiddleware = require("../middlewares/adminCheckMiddleware");

router.get("/single", dataCtrl.getData)

router.get("", dataCtrl.getAllData)

module.exports = router;