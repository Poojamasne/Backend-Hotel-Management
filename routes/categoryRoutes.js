const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:slug', categoryController.getCategoryBySlug);

// Admin routes (protected)
// Note: These routes are prefixed with /admin in your main app.js
router.post('/', protect, admin, upload.single('image'), categoryController.createCategory);
router.put('/:id', protect, admin, upload.single('image'), categoryController.updateCategory);
router.delete('/:id', protect, admin, categoryController.deleteCategory);


module.exports = router;