const express = require('express');
const notifyCtrl = require('../controllers/NotificationController');
const router = express.Router();

router.post('/save-token', notifyCtrl.saveFCMToken);
router.post('/send', notifyCtrl.notificationSender);

module.exports = router;
