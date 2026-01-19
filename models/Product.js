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
 
// Update product - SIMPLE FIXED VERSION
static async update(id, updateData) {
  console.log('=== PRODUCT.update() CALLED ===');
  console.log('Product ID to update:', id);
  console.log('Update data received:', updateData);
  
  if (!updateData || Object.keys(updateData).length === 0) {
    throw new Error('No data provided for update');
  }
  
  try {
    // Build UPDATE query
    const fields = [];
    const values = [];
    
    // Always update updated_at
    fields.push('updated_at = NOW()');
    
    // Process each field
    for (const [key, value] of Object.entries(updateData)) {
      console.log(`Processing field: ${key} = ${value} (type: ${typeof value})`);
      
      // Skip if value is undefined or null
      if (value === undefined || value === null) {
        console.log(`Skipping ${key} because it's undefined/null`);
        continue;
      }
      
      // Skip empty strings for some fields (but allow for description)
      if (value === '' && key !== 'description' && key !== 'prep_time') {
        console.log(`Skipping ${key} because it's empty string`);
        continue;
      }
      
      // Handle different field types
      if (key === 'tags' || key === 'ingredients') {
        fields.push(`${key} = ?`);
        if (Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else if (typeof value === 'string' && value.startsWith('[')) {
          // Already JSON string
          values.push(value);
        } else {
          // Convert to array and stringify
          const arr = typeof value === 'string' ? value.split(',').map(item => item.trim()) : [value];
          values.push(JSON.stringify(arr));
        }
      } else if (key === 'price' || key === 'original_price') {
        fields.push(`${key} = ?`);
        values.push(parseFloat(value));
      } else if (key === 'category_id') {
        fields.push(`${key} = ?`);
        values.push(parseInt(value));
      } else if (key === 'is_available' || key === 'is_popular' || key === 'is_featured') {
        fields.push(`${key} = ?`);
        const boolValue = value === true || value === 'true' || value === '1' || value === 1;
        values.push(boolValue ? 1 : 0);
      } else if (key === 'type') {
        fields.push(`${key} = ?`);
        values.push(value.toString().toLowerCase());
      } else if (key === 'image') {
        fields.push(`${key} = ?`);
        // Store image path as-is
        values.push(value);
      } else {
        // All other fields (name, description, prep_time, etc.)
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    // Add ID for WHERE clause
    values.push(id);
    
    console.log('SQL fields:', fields);
    console.log('SQL values:', values);
    
    // Build and execute SQL
    const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
    console.log('Executing SQL:', sql);
    
    const [result] = await db.execute(sql, values);
    console.log('Update result - Rows affected:', result.affectedRows);
    
    // Return updated product
    return await this.findById(id);
    
  } catch (error) {
    console.error('Database update error:', error);
    console.error('SQL Error:', error.sqlMessage);
    console.error('SQL:', error.sql);
    throw error;
  }
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

