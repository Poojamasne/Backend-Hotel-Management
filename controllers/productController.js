const Product = require('../models/Product');

// @desc    Get all products with filters
// @route   GET /api/products
exports.getAllProducts = async (req, res) => {
    try {
        const filters = req.query;
        console.log('Getting products with filters:', filters);
        
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
        console.log('Create product request body:', JSON.stringify(req.body, null, 2));
        
        const {
            name, description, price, original_price, category_id,
            category_slug, image, type, tags, prep_time,
            ingredients, is_available, is_popular, is_featured
        } = req.body;
        
        // Validate required fields
        if (!name || !price || !category_id || !type) {
            console.log('Missing required fields:', { name, price, category_id, type });
            return res.status(400).json({
                success: false,
                message: 'Required fields: name, price, category_id, type'
            });
        }
        
        console.log('Creating product with data:', {
            name,
            description: description || '',
            price: parseFloat(price),
            original_price: original_price ? parseFloat(original_price) : null,
            category_id: parseInt(category_id),
            category_slug: category_slug || null,
            image: image || null,
            type,
            tags: tags || [],
            prep_time: prep_time || '15-20 min',
            ingredients: ingredients || [],
            is_available: is_available !== undefined ? Boolean(is_available) : true,
            is_popular: is_popular !== undefined ? Boolean(is_popular) : false,
            is_featured: is_featured !== undefined ? Boolean(is_featured) : false
        });
        
        const product = await Product.create({
            name,
            description: description || '',
            price: parseFloat(price),
            original_price: original_price ? parseFloat(original_price) : null,
            category_id: parseInt(category_id),
            category_slug: category_slug || null,
            image: image || null,
            type,
            tags: tags || [],
            prep_time: prep_time || '15-20 min',
            ingredients: ingredients || [],
            is_available: is_available !== undefined ? Boolean(is_available) : true,
            is_popular: is_popular !== undefined ? Boolean(is_popular) : false,
            is_featured: is_featured !== undefined ? Boolean(is_featured) : false
        });
        
        console.log('Product created successfully:', product.id);
        
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        console.error('Create product error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error code:', error.code);
        console.error('Error sqlMessage:', error.sqlMessage);
        console.error('Error sql:', error.sql);
        
        // Handle specific MySQL errors
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Invalid category_id. The category does not exist.'
            });
        }
        
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(400).json({
                success: false,
                message: 'Invalid field in request. Please check your data.',
                field: error.sqlMessage
            });
        }
        
        if (error.code === 'ER_DATA_TOO_LONG') {
            return res.status(400).json({
                success: false,
                message: 'Data too long for a field. Please check your input.',
                field: error.sqlMessage
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
            sqlError: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Update product (Admin only)
// @route   PUT /api/admin/products/:id
exports.updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const updateData = req.body;
        
        console.log('Update product request:', productId, updateData);
        
        // Check if product exists
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Handle boolean conversions
        if (updateData.is_available !== undefined) {
            updateData.is_available = updateData.is_available === true || updateData.is_available === 'true';
        }
        if (updateData.is_popular !== undefined) {
            updateData.is_popular = updateData.is_popular === true || updateData.is_popular === 'true';
        }
        if (updateData.is_featured !== undefined) {
            updateData.is_featured = updateData.is_featured === true || updateData.is_featured === 'true';
        }
        
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