const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');

// @desc    Get all categories
// @route   GET /api/categories
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.findAll(true);
        
        res.json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get category by slug
// @route   GET /api/categories/:slug
exports.getCategoryBySlug = async (req, res) => {
    try {
        const category = await Category.findBySlug(req.params.slug);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        
        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Create category (Admin only)
// @route   POST /api/admin/categories
// In categoryController.js

// @desc    Create category (Admin only)
// @route   POST /api/admin/categories
exports.createCategory = async (req, res) => {
    try {
        const { name, description, display_order } = req.body;
        
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: 'Name and description are required'
            });
        }
        
        // Handle file upload
        let imagePath = '/images/categories/default.jpg';
        if (req.file) {
            // Generate a unique filename
            const fileName = `category-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
            imagePath = `/uploads/categories/${fileName}`;
            
            // CORRECTED: Save to backend/uploads directory (not public/uploads)
            const uploadDir = path.join(__dirname, '..', 'uploads', 'categories');
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            const filePath = path.join(uploadDir, fileName);
            
            // Write the file
            fs.writeFileSync(filePath, req.file.buffer);
            
            console.log('File saved to:', filePath);
            console.log('Accessible at:', `https://backend-hotel-management.onrender.com${imagePath}`);
        }
        
        const category = await Category.create({
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            description,
            image: imagePath,
            display_order: display_order || 0,
            item_count: 0,
            is_active: 1,
            created_at: new Date(),
            updated_at: new Date()
        });
        
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Also update updateCategory function:
exports.updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, description, display_order } = req.body;
        
        // Check if category exists
        const existingCategory = await Category.findById(categoryId);
        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        
        // Handle file upload
        let imagePath = existingCategory.image;
        if (req.file) {
            // Generate a unique filename
            const fileName = `category-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
            imagePath = `/uploads/categories/${fileName}`;
            
            // CORRECTED: Save to backend/uploads directory
            const uploadDir = path.join(__dirname, '..', 'uploads', 'categories');
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            const filePath = path.join(uploadDir, fileName);
            
            // Write the file
            fs.writeFileSync(filePath, req.file.buffer);
            
            // Delete old image if it's not the default
            if (existingCategory.image && 
                existingCategory.image !== '/images/categories/default.jpg' &&
                existingCategory.image.startsWith('/uploads/')) {
                const oldPath = path.join(__dirname, '..', 'uploads', existingCategory.image.replace('/uploads/', ''));
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
        }
        
        const category = await Category.update(categoryId, {
            name,
            description,
            image: imagePath,
            display_order: display_order || existingCategory.display_order,
            updated_at: new Date()
        });
        
        res.json({
            success: true,
            message: 'Category updated successfully',
            data: category
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Also update deleteCategory function:
exports.deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        // Check if category exists
        const existingCategory = await Category.findById(categoryId);
        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        
        // Delete image file if it's not the default
        if (existingCategory.image && 
            existingCategory.image !== '/images/categories/default.jpg' &&
            existingCategory.image.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, '..', 'uploads', existingCategory.image.replace('/uploads/', ''));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        await Category.delete(categoryId);
        
        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};