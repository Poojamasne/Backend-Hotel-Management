const Product = require('../models/Product');

// @desc    Get all products with filters
// @route   GET /api/products
exports.getAllProducts = async (req, res) => {
    try {
        const filters = req.query;
        const products = await Product.findAll(filters);
        
        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get products by category
// @route   GET /api/products/category/:slug
exports.getProductsByCategory = async (req, res) => {
    try {
        const products = await Product.findAll({
            category_slug: req.params.slug
        });
        
        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('Get category products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Search products
// @route   GET /api/products/search/:query
exports.searchProducts = async (req, res) => {
    try {
        const products = await Product.search(req.params.query);
        
        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Create product (Admin only)
// @route   POST /api/admin/products
exports.createProduct = async (req, res) => {
    try {
        const {
            name, description, price, original_price, category_id,
            category_slug, image, type, tags, prep_time,
            ingredients, is_popular, is_featured
        } = req.body;
        
        if (!name || !description || !price || !category_id || !image || !type) {
            return res.status(400).json({
                success: false,
                message: 'Required fields are missing'
            });
        }
        
        const product = await Product.create({
            name,
            description,
            price: parseFloat(price),
            original_price: original_price ? parseFloat(original_price) : null,
            category_id: parseInt(category_id),
            category_slug,
            image,
            type,
            tags: tags ? JSON.stringify(tags) : null,
            prep_time,
            ingredients: ingredients ? JSON.stringify(ingredients) : null,
            is_popular: is_popular === 'true',
            is_featured: is_featured === 'true'
        });
        
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update product (Admin only)
// @route   PUT /api/admin/products/:id
exports.updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const updateData = req.body;
        
        // Check if product exists
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Convert string values if needed
        if (updateData.price) updateData.price = parseFloat(updateData.price);
        if (updateData.original_price) updateData.original_price = parseFloat(updateData.original_price);
        if (updateData.category_id) updateData.category_id = parseInt(updateData.category_id);
        if (updateData.tags) updateData.tags = JSON.stringify(updateData.tags);
        if (updateData.ingredients) updateData.ingredients = JSON.stringify(updateData.ingredients);
        if (updateData.is_popular) updateData.is_popular = updateData.is_popular === 'true';
        if (updateData.is_featured) updateData.is_featured = updateData.is_featured === 'true';
        
        const product = await Product.update(productId, updateData);
        
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Delete product (Admin only)
// @route   DELETE /api/admin/products/:id
exports.deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Check if product exists
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        await Product.delete(productId);
        
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};