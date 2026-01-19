const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Admin Login (Public)
// @route   POST /api/admin/login
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Admin login attempt:', email);
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }
        
        // Check if admin user exists
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            console.log('No user found with email:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }
        
        const user = users[0];
        
        // Check if user is admin
        if (user.role !== 'admin') {
            console.log('User is not admin:', user.role);
            return res.status(401).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }
        
        // For demo/testing: Allow password 'admin123' without bcrypt
        // In production, you should use bcrypt.compare
        if (password === 'admin123') {
            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET || 'your_jwt_secret',
                { expiresIn: '7d' }
            );
            
            console.log('Admin login successful:', user.email);
            
            res.json({
                success: true,
                message: 'Admin login successful',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            // Try bcrypt compare for hashed passwords
            try {
                const isPasswordValid = await bcrypt.compare(password, user.password);
                if (isPasswordValid) {
                    // Generate JWT token
                    const token = jwt.sign(
                        { id: user.id, role: user.role },
                        process.env.JWT_SECRET || 'your_jwt_secret',
                        { expiresIn: '7d' }
                    );
                    
                    res.json({
                        success: true,
                        message: 'Admin login successful',
                        token,
                        user: {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role
                        }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        message: 'Invalid admin credentials'
                    });
                }
            } catch (bcryptError) {
                console.error('Bcrypt error:', bcryptError);
                res.status(401).json({
                    success: false,
                    message: 'Invalid admin credentials'
                });
            }
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get Dashboard Statistics
// @route   GET /api/admin/dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        // Get total counts
        const [[{ total_users }]] = await db.execute('SELECT COUNT(*) as total_users FROM users');
        const [[{ total_products }]] = await db.execute('SELECT COUNT(*) as total_products FROM products WHERE is_available = TRUE');
        const [[{ total_orders }]] = await db.execute('SELECT COUNT(*) as total_orders FROM orders');
        const [[{ total_revenue }]] = await db.execute('SELECT COALESCE(SUM(final_amount), 0) as total_revenue FROM orders WHERE payment_status = "paid"');
        
        // Today's stats
        const today = new Date().toISOString().split('T')[0];
        const [[{ today_orders }]] = await db.execute(
            'SELECT COUNT(*) as today_orders FROM orders WHERE DATE(created_at) = ?',
            [today]
        );
        
        const [[{ today_revenue }]] = await db.execute(
            'SELECT COALESCE(SUM(final_amount), 0) as today_revenue FROM orders WHERE DATE(created_at) = ? AND payment_status = "paid"',
            [today]
        );
        
        // Recent orders (last 5)
        const [recent_orders] = await db.execute(`
            SELECT o.*, u.name as customer_name 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC 
            LIMIT 5
        `);
        
        // Top products
        const [top_products] = await db.execute(`
            SELECT p.name, COUNT(oi.id) as total_sold, SUM(oi.total_price) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            GROUP BY p.id
            ORDER BY total_sold DESC
            LIMIT 5
        `);
        
        res.json({
            success: true,
            data: {
                stats: {
                    total_users,
                    total_products,
                    total_orders,
                    total_revenue,
                    today_orders,
                    today_revenue
                },
                recent_orders,
                top_products
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get All Products (Admin)
// @route   GET /api/admin/products
exports.getAdminProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE 1=1
        `;
        
        let countQuery = `SELECT COUNT(*) as total FROM products WHERE 1=1`;
        const params = [];
        const countParams = [];
        
        // Filters
        if (req.query.search) {
            query += ' AND p.name LIKE ?';
            countQuery += ' AND name LIKE ?';
            params.push(`%${req.query.search}%`);
            countParams.push(`%${req.query.search}%`);
        }
        
        if (req.query.category) {
            query += ' AND p.category_id = ?';
            countQuery += ' AND category_id = ?';
            params.push(req.query.category);
            countParams.push(req.query.category);
        }
        
        if (req.query.status === 'active') {
            query += ' AND p.is_available = TRUE';
            countQuery += ' AND is_available = TRUE';
        } else if (req.query.status === 'inactive') {
            query += ' AND p.is_available = FALSE';
            countQuery += ' AND is_available = FALSE';
        }
        
        // Add pagination
        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        // Execute queries
        const [products] = await db.execute(query, params);
        const [[{ total }]] = await db.execute(countQuery, countParams);
        
        res.json({
            success: true,
            total: parseInt(total),
            page,
            limit,
            total_pages: Math.ceil(total / limit),
            data: products
        });
    } catch (error) {
        console.error('Get admin products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create Product (Admin)
// @route   POST /api/admin/products
exports.createProduct = async (req, res) => {
    try {
        const {
            name, description, price, original_price, category_id,
            image, type, tags, prep_time, ingredients,
            is_available, is_popular, is_featured
        } = req.body;
        
        // Validation
        if (!name || !price || !category_id || !image || !type) {
            return res.status(400).json({
                success: false,
                message: 'Name, price, category, image and type are required'
            });
        }
        
        // Get category slug
        const [categories] = await db.execute(
            'SELECT slug FROM categories WHERE id = ?',
            [category_id]
        );
        
        if (categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category'
            });
        }
        
        const category_slug = categories[0].slug;
        
        // Insert product
        const [result] = await db.execute(`
            INSERT INTO products 
            (name, description, price, original_price, category_id, category_slug, 
             image, type, tags, prep_time, ingredients, is_available, is_popular, is_featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name, description || '', parseFloat(price), 
            original_price ? parseFloat(original_price) : null,
            category_id, category_slug, image, type,
            tags ? JSON.stringify(tags) : null,
            prep_time || '15-20 min',
            ingredients ? JSON.stringify(ingredients) : null,
            is_available !== false,
            is_popular || false,
            is_featured || false
        ]);
        
        // Get the created product
        const [products] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: products[0]
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update Product (Admin)
// @route   PUT /api/admin/products/:id
exports.updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const updateData = req.body;
        
        // Check if product exists
        const [products] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );
        
        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Build update query
        const fields = [];
        const values = [];
        
        // Map allowed fields
        const allowedFields = [
            'name', 'description', 'price', 'original_price', 'category_id',
            'image', 'type', 'tags', 'prep_time', 'ingredients',
            'is_available', 'is_popular', 'is_featured'
        ];
        
        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                
                // Handle special fields
                if (key === 'tags' || key === 'ingredients') {
                    values.push(value ? JSON.stringify(value) : null);
                } else if (key === 'price' || key === 'original_price') {
                    values.push(value ? parseFloat(value) : null);
                } else if (key === 'category_id') {
                    values.push(parseInt(value));
                } else if (key === 'is_available' || key === 'is_popular' || key === 'is_featured') {
                    values.push(value === true || value === 'true');
                } else {
                    values.push(value);
                }
            }
        }
        
        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }
        
        // If category_id is being updated, also update category_slug
        if (updateData.category_id) {
            const [categories] = await db.execute(
                'SELECT slug FROM categories WHERE id = ?',
                [updateData.category_id]
            );
            
            if (categories.length > 0) {
                fields.push('category_slug = ?');
                values.push(categories[0].slug);
            }
        }
        
        // Add updated_at
        fields.push('updated_at = CURRENT_TIMESTAMP');
        
        // Add productId to values
        values.push(productId);
        
        // Execute update
        await db.execute(
            `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        // Get updated product
        const [updatedProducts] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );
        
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProducts[0]
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete Product (Admin)
// @route   DELETE /api/admin/products/:id
exports.deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Check if product exists
        const [products] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );
        
        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Soft delete - mark as unavailable
        await db.execute(
            'UPDATE products SET is_available = FALSE WHERE id = ?',
            [productId]
        );
        
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get All Orders (Admin)
// @route   GET /api/admin/orders
exports.getAdminOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            WHERE 1=1
        `;
        
        let countQuery = `SELECT COUNT(*) as total FROM orders WHERE 1=1`;
        const params = [];
        const countParams = [];
        
        // Filters
        if (req.query.status) {
            query += ' AND o.order_status = ?';
            countQuery += ' AND order_status = ?';
            params.push(req.query.status);
            countParams.push(req.query.status);
        }
        
        if (req.query.date_from) {
            query += ' AND DATE(o.created_at) >= ?';
            countQuery += ' AND DATE(created_at) >= ?';
            params.push(req.query.date_from);
            countParams.push(req.query.date_from);
        }
        
        if (req.query.date_to) {
            query += ' AND DATE(o.created_at) <= ?';
            countQuery += ' AND DATE(created_at) <= ?';
            params.push(req.query.date_to);
            countParams.push(req.query.date_to);
        }
        
        if (req.query.search) {
            query += ' AND (o.order_number LIKE ? OR u.name LIKE ?)';
            countQuery += ' AND (order_number LIKE ? OR user_id IN (SELECT id FROM users WHERE name LIKE ?))';
            params.push(`%${req.query.search}%`, `%${req.query.search}%`);
            countParams.push(`%${req.query.search}%`, `%${req.query.search}%`);
        }
        
        // Add pagination
        query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        // Execute queries
        const [orders] = await db.execute(query, params);
        const [[{ total }]] = await db.execute(countQuery, countParams);
        
        // Get order items for each order
        for (const order of orders) {
            const [items] = await db.execute(
                'SELECT * FROM order_items WHERE order_id = ?',
                [order.id]
            );
            order.items = items;
            order.items_count = items.length;
        }
        
        res.json({
            success: true,
            total: parseInt(total),
            page,
            limit,
            total_pages: Math.ceil(total / limit),
            data: orders
        });
    } catch (error) {
        console.error('Get admin orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update Order Status (Admin)
// @route   PUT /api/admin/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status} = req.body;
        
        // Validate status
        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status is required'
            });
        }
        
        // Check if order exists
        const [orders] = await db.execute(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        const order = orders[0];
        
        // Update order status
        await db.execute(
            'UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, orderId]
        );
        
        // If status is delivered, mark payment as paid if COD
        if (status === 'delivered' && order.payment_method === 'cod') {
            await db.execute(
                'UPDATE orders SET payment_status = "paid" WHERE id = ?',
                [orderId]
            );
        }
        
        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            data: {
                id: orderId,
                order_number: order.order_number,
                order_status: status,
                updated_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all users with pagination (Admin only)
// @route   GET /api/admin/users/paginated
exports.getAllUsersPaginated = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const result = await User.findAllPaginated(page, limit);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Get paginated users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get user by ID (Admin only)
// @route   GET /api/admin/users/:id
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update user status (Admin only)
// @route   PUT /api/admin/users/:id/status
exports.updateUserStatus = async (req, res) => {
    try {
        const { is_active } = req.body;
        
        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'is_active must be a boolean value'
            });
        }
        
        const user = await User.updateStatus(req.params.id, is_active);
        
        res.json({
            success: true,
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
            data: user
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update user role (Admin only)
// @route   PUT /api/admin/users/:id/role
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Role must be either "user" or "admin"'
            });
        }
        
        const user = await User.updateRole(req.params.id, role);
        
        res.json({
            success: true,
            message: `User role updated to ${role} successfully`,
            data: user
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Check if user exists
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Prevent deleting own account
        if (parseInt(userId) === parseInt(req.user.id)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }
        
        // Delete user from database
        const db = require('../config/database');
        await db.execute('DELETE FROM users WHERE id = ?', [userId]);
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};