const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');


router.post('/create', protect, orderController.createOrder);
router.get('/my-orders', protect, orderController.getMyOrders);
router.get('/:id', protect, orderController.getOrderById);
router.get('/number/:orderNumber', protect, orderController.getOrderByNumber);
router.put('/:id/cancel', protect, orderController.cancelOrder);
router.get('/:id/status', protect, orderController.getOrderStatus);
router.get('/stats/user', protect, orderController.getUserOrderStats);

// ===================== ADMIN ROUTES ===================== //

// Get all orders
router.get('/', protect, admin, orderController.getAllOrders);

// Get order details (admin)
router.get('/admin/:id', protect, admin, orderController.getOrderDetailsAdmin);

// Update order status
router.put('/:id/status', protect, admin, orderController.updateOrderStatus);

// Update payment status
router.put('/:id/payment-status', protect, admin, orderController.updatePaymentStatus);

// Get admin order statistics
router.get('/stats/admin', protect, admin, orderController.getAdminOrderStats);

// Get recent orders
router.get('/recent', protect, admin, orderController.getRecentOrders);

module.exports = router;