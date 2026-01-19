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
        console.log('Create product request received');
        console.log('Request body:', req.body);
        console.log('Files:', req.file); // Check for uploaded file
        
        // Parse tags and ingredients if they come as strings
        let { 
            name, description, price, original_price, category_id,
            image, type, tags, prep_time,
            ingredients, is_available, is_popular, is_featured
        } = req.body;
        
        // Handle file upload
        let imageUrl = image || null;
        if (req.file) {
            imageUrl = `/uploads/products/${req.file.filename}`;
        }
        
        // Parse tags and ingredients (they might come as strings from form-data)
        let parsedTags = [];
        let parsedIngredients = [];
        
        if (tags) {
            try {
                parsedTags = JSON.parse(tags);
            } catch (error) {
                parsedTags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
            }
        }
        
        if (ingredients) {
            try {
                parsedIngredients = JSON.parse(ingredients);
            } catch (error) {
                parsedIngredients = Array.isArray(ingredients) ? ingredients : ingredients.split(',').map(ing => ing.trim());
            }
        }
        
        // Validate required fields - Updated to include image
        if (!name || !price || !category_id || !type || !imageUrl) {
            console.log('Missing required fields:', { 
                name, price, category_id, type, image: imageUrl 
            });
            return res.status(400).json({
                success: false,
                message: 'Name, price, category, image and type are required'
            });
        }
        
        // Validate type field
        const productType = type.toLowerCase();
        if (productType !== 'veg' && productType !== 'non-veg') {
            return res.status(400).json({
                success: false,
                message: 'Type must be either "veg" or "non-veg"'
            });
        }
        
        // Prepare data for creation
        const productData = {
            name: name.trim(),
            description: description ? description.trim() : '',
            price: parseFloat(price),
            original_price: original_price ? parseFloat(original_price) : null,
            category_id: parseInt(category_id),
            image: imageUrl,
            type: productType,
            tags: parsedTags,
            prep_time: prep_time || '15-20 min',
            ingredients: parsedIngredients,
            is_available: is_available !== undefined 
                ? (is_available === true || is_available === 'true' || is_available === '1') 
                : true,
            is_popular: is_popular !== undefined 
                ? (is_popular === true || is_popular === 'true' || is_popular === '1') 
                : false,
            is_featured: is_featured !== undefined 
                ? (is_featured === true || is_featured === 'true' || is_featured === '1') 
                : false
        };
        
        console.log('Creating product with processed data:', productData);
        
        const product = await Product.create(productData);
        
        console.log('Product created successfully:', product.id);
        
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        console.error('Create product error:', error);
        
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
        
        if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            return res.status(400).json({
                success: false,
                message: 'Invalid value for field. Please check your data types.',
                field: error.sqlMessage
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
            sqlError: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
        });
    }
};

// @desc    Update product (Admin only) - SIMPLE FIXED VERSION
// @route   PUT /api/admin/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    
    console.log('=== UPDATE START ===');
    console.log('Product ID:', productId);
    
    // Check if product exists
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log('Existing product found:', existingProduct.id, existingProduct.name);
    
    // SIMPLE APPROACH: Create updateData from scratch
    let updateData = {};
    
    // Handle name
    if (req.body.name && req.body.name.trim() !== '') {
      updateData.name = req.body.name.trim();
    }
    
    // Handle price
    if (req.body.price && !isNaN(parseFloat(req.body.price))) {
      updateData.price = parseFloat(req.body.price);
    }
    
    // Handle type
    if (req.body.type && ['veg', 'non-veg'].includes(req.body.type.toLowerCase())) {
      updateData.type = req.body.type.toLowerCase();
    }
    
    // Handle description
    if (req.body.description !== undefined) {
      updateData.description = req.body.description;
    }
    
    // Handle category_id
    if (req.body.category_id && !isNaN(parseInt(req.body.category_id))) {
      updateData.category_id = parseInt(req.body.category_id);
    }
    
    // Handle image - MOST IMPORTANT!
    if (req.file) {
      updateData.image = `/uploads/products/${req.file.filename}`;
      console.log('New image uploaded:', updateData.image);
    } else if (req.body.image && req.body.image !== 'undefined') {
      updateData.image = req.body.image;
    }
    
    // Handle booleans
    if (req.body.is_available !== undefined) {
      updateData.is_available = req.body.is_available === 'true' || req.body.is_available === '1' || req.body.is_available === true;
    }
    
    if (req.body.is_popular !== undefined) {
      updateData.is_popular = req.body.is_popular === 'true' || req.body.is_popular === '1' || req.body.is_popular === true;
    }
    
    if (req.body.is_featured !== undefined) {
      updateData.is_featured = req.body.is_featured === 'true' || req.body.is_featured === '1' || req.body.is_featured === true;
    }
    
    // Handle original_price
    if (req.body.original_price && !isNaN(parseFloat(req.body.original_price))) {
      updateData.original_price = parseFloat(req.body.original_price);
    }
    
    // Handle prep_time
    if (req.body.prep_time) {
      updateData.prep_time = req.body.prep_time;
    }
    
    // Handle tags
    if (req.body.tags !== undefined) {
      try {
        if (typeof req.body.tags === 'string') {
          updateData.tags = JSON.parse(req.body.tags);
        } else {
          updateData.tags = req.body.tags;
        }
      } catch (error) {
        updateData.tags = req.body.tags.split(',').map(tag => tag.trim());
      }
    }
    
    // Handle ingredients
    if (req.body.ingredients !== undefined) {
      try {
        if (typeof req.body.ingredients === 'string') {
          updateData.ingredients = JSON.parse(req.body.ingredients);
        } else {
          updateData.ingredients = req.body.ingredients;
        }
      } catch (error) {
        updateData.ingredients = req.body.ingredients.split(',').map(ing => ing.trim());
      }
    }
    
    console.log('Final updateData object:', JSON.stringify(updateData, null, 2));
    console.log('Number of fields to update:', Object.keys(updateData).length);
    
    // CRITICAL: If no fields, add at least one field to update
    if (Object.keys(updateData).length === 0) {
      console.log('No fields provided. Using name as default update.');
      updateData.name = existingProduct.name;
    }
    
    // Call update method
    console.log('Calling Product.update() with data:', updateData);
    const product = await Product.update(productId, updateData);
    
    console.log('✅ Update successful!');
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
    
  } catch (error) {
    console.error('❌ Update product error:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: error.message,
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