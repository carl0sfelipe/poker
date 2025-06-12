const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/profile', auth, userController.getProfile);
router.get('/validate', auth, (req, res) => {
  // Se chegou até aqui, o token é válido (passou pelo middleware auth)
  res.json({ valid: true, user: req.user });
});

module.exports = router; 