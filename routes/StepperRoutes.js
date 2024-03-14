const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const employeeChecker = require("../middlewares/employeeChecker");
const stepCtrl = require("../controllers/StepperController");

router.post("/create",  employeeChecker, stepCtrl.CreateMultipleSteppers)
router.get("/get/:id",  employeeChecker, stepCtrl.GetSingleStepper)
router.get("/get-all/:id",  employeeChecker, stepCtrl.GetAllSteppers)
router.put("/update",  employeeChecker, stepCtrl.updateStepper)
router.delete("/delete/:id",  employeeChecker, stepCtrl.DeleteAStepper)

module.exports = router;