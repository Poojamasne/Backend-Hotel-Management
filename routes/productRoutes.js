const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const { protect, admin } = require('../middleware/auth');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/search/:query', productController.searchProducts);
router.get('/category/:slug', productController.getProductsByCategory);
router.get('/:id', productController.getProductById);

// Admin routes - FIXED: Add upload.single() to PUT route too!
router.post('/', protect, admin, upload.single('image'), productController.createProduct);
router.put('/:id', protect, admin, upload.single('image'), productController.updateProduct); // ADDED upload.single()
router.delete('/:id', protect, admin, productController.deleteProduct);

module.exports = router;