const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect, admin } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/', contactController.createContactMessage);

// Admin routes (require authentication and admin role)
router.get('/messages', protect, admin, contactController.getContactMessages);
router.get('/messages/:id', protect, admin, contactController.getContactMessageById);
router.put('/messages/:id/status', protect, admin, contactController.updateMessageStatus);
router.delete('/messages/:id', protect, admin, contactController.deleteContactMessage);
router.get('/stats', protect, admin, contactController.getContactStats);

module.exports = router;