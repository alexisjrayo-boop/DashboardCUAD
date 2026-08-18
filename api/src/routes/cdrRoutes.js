const express = require('express');
const router = express.Router();
const cdrController = require('../controllers/cdrController');
const reportController = require('../controllers/reportController');
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

// Manual Report Download (Protected)
router.post('/report/manual', verifyToken, reportController.downloadManualReport);

// Email Reports Configuration (Protected - Singular & Plural routes)
router.get('/config/email-report', verifyToken, reportController.getEmailReportConfigs);
router.get('/config/email-reports', verifyToken, reportController.getEmailReportConfigs);

router.post('/config/email-report', verifyToken, reportController.saveEmailReportConfig);
router.post('/config/email-reports', verifyToken, reportController.saveEmailReportConfig);

router.put('/config/email-report/:id', verifyToken, reportController.saveEmailReportConfig);
router.put('/config/email-reports/:id', verifyToken, reportController.saveEmailReportConfig);

router.delete('/config/email-report/:id', verifyToken, reportController.deleteEmailReportConfig);
router.delete('/config/email-reports/:id', verifyToken, reportController.deleteEmailReportConfig);

router.post('/config/send-test-email', verifyToken, reportController.sendTestEmailReport);

module.exports = router;
