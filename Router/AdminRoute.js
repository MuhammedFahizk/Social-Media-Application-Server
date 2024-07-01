const express = require('express');

const router = express.Router();
const adminController = require('../controller/Admin');
// Example route
// router.post('/signUp',adminController)
router.post('/Login', adminController.adminLogin);
router.post('/generateAccessToken', adminController.generateAccessToken);

module.exports = router;
