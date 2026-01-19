const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');

// Public routes
router.get('/', offerController.getAllOffers);

module.exports = router;