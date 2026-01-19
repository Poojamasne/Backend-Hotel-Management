const db = require('../config/database');

class Product {
    // Create product
    static async create(productData) {
        const { 
            name, description, price, original_price, category_id, 
            image, type, tags, prep_time, 
            ingredients, is_available, is_popular, is_featured 
        } = productData;
        
        console.log('Creating product with data:', {
            name, description, price, category_id, type,
            is_available, is_popular, is_featured
        });
        
        // Handle boolean values properly
        const isAvailable = is_available !== undefined ? Boolean(is_available) : true;
        const isPopular = is_popular !== undefined ? Boolean(is_popular) : false;
        const isFeatured = is_featured !== undefined ? Boolean(is_featured) : false;
        
        console.log('Boolean values after processing:', {
            isAvailable, isPopular, isFeatured
        });
        
        try {
            // Generate category slug from name (truncate to 100 chars for database)
            let categorySlug = this.generateSlug(name);
            if (categorySlug.length > 100) {
                categorySlug = categorySlug.substring(0, 100);
            }
            
            // Handle tags and ingredients - ensure they're arrays
            const tagsArray = Array.isArray(tags) ? tags : [];
            const ingredientsArray = Array.isArray(ingredients) ? ingredients : [];
            
            console.log('Final data for insertion:', {
                name,
                category_id: parseInt(category_id),
                category_slug: categorySlug,
                type: type.toLowerCase(),
                tags: tagsArray.length > 0 ? JSON.stringify(tagsArray) : null,
                ingredients: ingredientsArray.length > 0 ? JSON.stringify(ingredientsArray) : null,
                isAvailable, isPopular, isFeatured
            });
            
            const [result] = await db.execute(
                `INSERT INTO products 
                (name, description, price, original_price, category_id, 
                 category_slug, image, type, tags, prep_time, 
                 ingredients, is_available, is_popular, is_featured,
                 rating, rating_count, total_orders, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    name, 
                    description || '', 
                    parseFloat(price), 
                    original_price ? parseFloat(original_price) : null, 
                    parseInt(category_id),
                    categorySlug, // Use generated slug
                    image || null,
                    type.toLowerCase(), // Ensure lowercase for ENUM
                    tagsArray.length > 0 ? JSON.stringify(tagsArray) : null, 
                    prep_time || '15-20 min',
                    ingredientsArray.length > 0 ? JSON.stringify(ingredientsArray) : null, 
                    isAvailable ? 1 : 0,
                    isPopular ? 1 : 0,
                    isFeatured ? 1 : 0,
                    0.0,  // Default rating (0.0)
                    0,    // Default rating_count (0)
                    0     // Default total_orders (0)
                ]
            );
            
            console.log('Product created with ID:', result.insertId);
            
            // Return the created product directly without calling findById
            return {
                id: result.insertId,
                name: name,
                description: description || '',
                price: parseFloat(price),
                original_price: original_price ? parseFloat(original_price) : null,
                category_id: parseInt(category_id),
                category_slug: categorySlug,
                image: image || null,
                type: type.toLowerCase(),
                tags: tagsArray,
                prep_time: prep_time || '15-20 min',
                ingredients: ingredientsArray,
                is_available: isAvailable ? 1 : 0,
                is_popular: isPopular ? 1 : 0,
                is_featured: isFeatured ? 1 : 0,
                rating: 0.0,
                rating_count: 0,
                total_orders: 0,
                created_at: new Date(),
                updated_at: new Date()
            };
            
        } catch (error) {
            console.error('Database error in Product.create:', error);
            if (error.sqlMessage) {
                console.error('SQL Error Message:', error.sqlMessage);
                console.error('SQL Error Code:', error.code);
                console.error('SQL Error Number:', error.errno);
                console.error('SQL State:', error.sqlState);
                console.error('SQL Query that failed:', error.sql);
            }
            throw error;
        }
    }
    
    // Helper to generate slug
    static generateSlug(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    
    // Get all products with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT p.*, c.name as category_name, c.slug as category_slug 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE 1=1
        `;
        const values = [];
        
        if (filters.category_id) {
            query += ' AND p.category_id = ?';
            values.push(filters.category_id);
        }
        
        if (filters.category_slug) {
    query += ' AND (c.slug = ? OR p.category_slug = ?)';
    values.push(filters.category_slug);
    values.push(filters.category_slug);
  }
        
        if (filters.type) {
            query += ' AND p.type = ?';
            values.push(filters.type);
        }
        
        if (filters.is_popular) {
            query += ' AND p.is_popular = TRUE';
        }
        
        if (filters.is_featured) {
            query += ' AND p.is_featured = TRUE';
        }
        
        // Only show available items by default
        if (filters.show_all !== 'true') {
            query += ' AND p.is_available = TRUE';
        }
        
        // Sorting
        if (filters.sort_by) {
            const sortMap = {
                'price_low': 'p.price ASC',
                'price_high': 'p.price DESC',
                'popular': 'p.rating DESC',
                'newest': 'p.created_at DESC',
                'name': 'p.name ASC'
            };
            query += ` ORDER BY ${sortMap[filters.sort_by] || 'p.created_at DESC'}`;
        } else {
            query += ' ORDER BY p.is_popular DESC, p.created_at DESC';
        }
        
        // Pagination
        if (filters.limit) {
            query += ' LIMIT ?';
            values.push(parseInt(filters.limit));
        }
        
        console.log('Product query:', query, values);
        const [rows] = await db.execute(query, values);
        return rows;
    }
    
    // Find product by ID
    static async findById(id) {
        const [rows] = await db.execute(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [id]
        );
        return rows[0];
    }
    
    // Update product - FIXED VERSION
static async update(id, updateData) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updateData)) {
        
        if (key === 'tags' || key === 'ingredients') {
           
            fields.push(`${key} = ?`);
            if (Array.isArray(value) && value.length > 0) {
                values.push(JSON.stringify(value));
            } else if (value) {
               
                try {
                    const parsed = JSON.parse(value);
                    values.push(JSON.stringify(parsed));
                } catch {
                    
                    values.push(value);
                }
            } else {
                values.push(null);
            }
        } else if (key === 'price' || key === 'original_price') {
           
            fields.push(`${key} = ?`);
            values.push(parseFloat(value) || 0);
        } else if (key === 'category_id') {
            
            fields.push(`${key} = ?`);
            const categoryId = parseInt(value);
            values.push(categoryId || null);
            
            if (categoryId) {
                try {
                    const [categoryRows] = await db.execute(
                        'SELECT slug FROM categories WHERE id = ?',
                        [categoryId]
                    );
                    if (categoryRows.length > 0) {
                        fields.push('category_slug = ?');
                        values.push(categoryRows[0].slug);
                    }
                } catch (error) {
                    console.error('Failed to get category slug:', error);
                }
            }
        } else if (key === 'is_available' || key === 'is_popular' || key === 'is_featured') {
            // Convert boolean to MySQL tinyint
            fields.push(`${key} = ?`);
            values.push(value ? 1 : 0);
        } else if (key === 'type' && value) {
            // Ensure type is lowercase for ENUM
            fields.push(`${key} = ?`);
            values.push(value.toLowerCase());
        } else if (key === 'category_slug') {
            // Allow category_slug updates
            fields.push(`${key} = ?`);
            values.push(value);
        } else {
            // Allow all other fields
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    // Always update updated_at
    fields.push('updated_at = NOW()');
    
    values.push(id);
    
    // Don't execute if no valid fields to update
    if (fields.length <= 1) { // Only updated_at
        throw new Error('No valid fields to update');
    }
    
    console.log('Update SQL:', `UPDATE products SET ${fields.join(', ')} WHERE id = ?`);
    console.log('Update values:', values);
    
    await db.execute(
        `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
    
    return this.findById(id);
}
    
    // Delete product (soft delete - set is_available to false)
    static async delete(id) {
        await db.execute(
            'UPDATE products SET is_available = FALSE, updated_at = NOW() WHERE id = ?',
            [id]
        );
        return true;
    }
    
    // Search products
    static async search(searchTerm) {
        const [rows] = await db.execute(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?) 
             AND p.is_available = TRUE 
             ORDER BY p.is_popular DESC, p.rating DESC 
             LIMIT 20`,
            [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
        );
        return rows;
    }
}

module.exports = Product;

