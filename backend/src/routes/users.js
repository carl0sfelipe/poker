const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, checkRole } = require('../middleware/auth');

router.get('/', auth, checkRole(['admin', 'staff']), userController.list);

module.exports = router;
