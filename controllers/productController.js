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

// @desc    Update product (Admin only)
// @route   PUT /api/admin/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    
    console.log('=== UPDATE REQUEST DEBUG ===');
    console.log('Product ID:', productId);
    console.log('Request Body (form-data):', req.body);
    console.log('Request File:', req.file);
    console.log('Request Body Keys:', Object.keys(req.body));
    
    // Check if product exists
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log('Existing Product:', {
      id: existingProduct.id,
      name: existingProduct.name,
      image: existingProduct.image
    });
    
    // Start with req.body (which contains form-data fields)
    let updateData = {};
    
    // Copy all fields from req.body except empty strings
    for (const [key, value] of Object.entries(req.body)) {
      if (value !== undefined && value !== null && value !== '') {
        updateData[key] = value;
      }
    }
    
    console.log('Initial updateData from form:', updateData);
    
    // Handle image upload
    if (req.file) {
      updateData.image = `/uploads/products/${req.file.filename}`;
      console.log('✅ New image uploaded:', updateData.image);
    } else if (req.body.image && req.body.image !== 'undefined') {
      // If image field exists in form-data (might be a URL string)
      updateData.image = req.body.image;
      console.log('Using provided image URL:', updateData.image);
    } else if (existingProduct.image) {
      // Keep existing image
      updateData.image = existingProduct.image;
      console.log('Keeping existing image:', updateData.image);
    }
    
    // Parse boolean fields from form-data strings
    if (updateData.is_available !== undefined) {
      updateData.is_available = updateData.is_available === 'true' || updateData.is_available === '1' || updateData.is_available === true;
      console.log('is_available parsed:', updateData.is_available);
    }
    
    if (updateData.is_popular !== undefined) {
      updateData.is_popular = updateData.is_popular === 'true' || updateData.is_popular === '1' || updateData.is_popular === true;
      console.log('is_popular parsed:', updateData.is_popular);
    }
    
    if (updateData.is_featured !== undefined) {
      updateData.is_featured = updateData.is_featured === 'true' || updateData.is_featured === '1' || updateData.is_featured === true;
      console.log('is_featured parsed:', updateData.is_featured);
    }
    
    // Parse tags and ingredients from form-data strings
    if (updateData.tags) {
      try {
        updateData.tags = JSON.parse(updateData.tags);
      } catch (error) {
        if (typeof updateData.tags === 'string') {
          updateData.tags = updateData.tags.split(',').map(tag => tag.trim());
        }
      }
    }
    
    if (updateData.ingredients) {
      try {
        updateData.ingredients = JSON.parse(updateData.ingredients);
      } catch (error) {
        if (typeof updateData.ingredients === 'string') {
          updateData.ingredients = updateData.ingredients.split(',').map(ing => ing.trim());
        }
      }
    }
    
    // Ensure type is lowercase
    if (updateData.type) {
      updateData.type = updateData.type.toLowerCase();
    }
    
    // Convert numeric fields
    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
    }
    
    if (updateData.original_price) {
      updateData.original_price = parseFloat(updateData.original_price);
    }
    
    if (updateData.category_id) {
      updateData.category_id = parseInt(updateData.category_id);
    }
    
    console.log('Final updateData before sending to model:', JSON.stringify(updateData, null, 2));
    console.log('Number of fields:', Object.keys(updateData).length);
    
    // Check if we have data to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }
    
    // Call the model's update method
    const product = await Product.update(productId, updateData);
    
    console.log('✅ Update successful! Product ID:', product.id);
    
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
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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