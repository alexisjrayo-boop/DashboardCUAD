const express = require('express');
const router = express.Router();
const cdrController = require('../controllers/cdrController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Health check (Public)
router.get('/health', cdrController.healthCheck);

// Live Query (Protected)
router.post('/cdr/query', verifyToken, cdrController.queryLive);

// Extensions Config (Protected)
router.get('/config/extensions', verifyToken, cdrController.getExtensions);

// DB Query (Protected)
router.get('/db/cdrs', verifyToken, cdrController.getStoredCdrs);

// Manual Trigger (Protected - Admin only)
router.post('/admin/trigger-fetch', verifyToken, isAdmin, cdrController.triggerManualFetch);

module.exports = router;
