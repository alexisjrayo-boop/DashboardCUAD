const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

router.post('/register', verifyToken, isAdmin, authController.register);
router.post('/login', authController.login);
router.get('/users', verifyToken, isAdmin, authController.getUsers);
router.put('/users/:id', verifyToken, isAdmin, authController.updateUser);
router.delete('/users/:id', verifyToken, isAdmin, authController.deleteUser);

module.exports = router;
