const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

// Rutas públicas
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/set-password', authController.setPassword);

// Rutas protegidas para Administradores
router.post('/register', verifyToken, isAdmin, authController.register);
router.post('/invite', verifyToken, isAdmin, authController.register);
router.post('/resend-reset/:id', verifyToken, isAdmin, authController.resendResetLink);
router.get('/users', verifyToken, isAdmin, authController.getUsers);
router.put('/users/:id', verifyToken, isAdmin, authController.updateUser);
router.delete('/users/:id', verifyToken, isAdmin, authController.deleteUser);

module.exports = router;
