const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// All cart routes require authentication
router.get('/', protect, cartController.getCart);
router.post('/add', protect, cartController.addToCart);
router.put('/update', protect, cartController.updateCart);
router.delete('/remove/:productId', protect, cartController.removeFromCart);
router.delete('/clear', protect, cartController.clearCart);
router.get('/count', protect, cartController.getCartCount);

module.exports = router;