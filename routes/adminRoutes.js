const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

// Public admin routes (no authentication needed)
router.post('/login', adminController.adminLogin);

// Protected admin routes (require admin authentication)
router.use(protect, admin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Product Management
router.get('/products', adminController.getAdminProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Order Management
router.get('/orders', adminController.getAdminOrders);
router.put('/orders/:id/status', adminController.updateOrderStatus);

// User Management
router.get('/users', async (req, res) => {
    try {
        const db = require('../config/database');
        const [users] = await db.execute(
            'SELECT id, name, email, phone, role, is_active, created_at FROM users ORDER BY created_at DESC'
        );
        
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin user management routes
router.get('/users', protect, admin, adminController.getAllUsers);
router.get('/users/paginated', protect, admin, adminController.getAllUsersPaginated);
router.get('/users/:id', protect, admin, adminController.getUserById);
router.put('/users/:id/status', protect, admin, adminController.updateUserStatus);
router.put('/users/:id/role', protect, admin, adminController.updateUserRole);
router.delete('/users/:id', protect, admin, adminController.deleteUser);


module.exports = router;