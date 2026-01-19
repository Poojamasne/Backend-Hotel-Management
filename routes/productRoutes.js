const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const { protect, admin } = require('../middleware/auth');

// Public
router.get('/', productController.getAllProducts);
router.get('/search/:query', productController.searchProducts);
router.get('/category/:slug', productController.getProductsByCategory);
router.get('/:id', productController.getProductById);

// Admin
router.post('/', protect, admin, upload.single('image'), productController.createProduct);
router.put('/:id', protect, admin, productController.updateProduct);
router.delete('/:id', protect, admin, productController.deleteProduct);

module.exports = router;
