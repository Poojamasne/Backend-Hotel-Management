const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload'); // Import upload middleware
const { protect, admin } = require('../middleware/auth');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/category/:slug', productController.getProductsByCategory);
router.get('/search/:query', productController.searchProducts);

// Admin routes (protected)
router.post('/admin/products', 
    protect, 
    admin, 
    upload.single('image'), // Add file upload middleware
    productController.createProduct
);

router.put('/admin/products/:id', protect, admin, productController.updateProduct);
router.delete('/admin/products/:id', protect, admin, productController.deleteProduct);

module.exports = router;