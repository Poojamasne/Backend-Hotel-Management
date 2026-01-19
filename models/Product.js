const db = require('../config/database');

class Product {
    // Create product
    static async create(productData) {
        const { 
            name, description, price, original_price, category_id, 
            category_slug, image, type, tags, prep_time, 
            ingredients, is_available, is_popular, is_featured 
        } = productData;
        
        console.log('Creating product with data:', {
            name, description, price, category_id, category_slug, image, type
        });
        
        const [result] = await db.execute(
            `INSERT INTO products 
            (name, description, price, original_price, category_id, 
             category_slug, image, type, tags, prep_time, 
             ingredients, is_available, is_popular, is_featured,
             created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                name, 
                description || '', 
                parseFloat(price), 
                original_price ? parseFloat(original_price) : null, 
                parseInt(category_id),
                category_slug || this.generateSlug(name), 
                image || '/images/dishes/default-food.jpg', 
                type, 
                tags ? JSON.stringify(tags) : null, 
                prep_time || '15-20 min',
                ingredients ? JSON.stringify(ingredients) : null, 
                is_available !== undefined ? is_available : true,
                is_popular || false, 
                is_featured || false
            ]
        );
        
        console.log('Product created with ID:', result.insertId);
        return this.findById(result.insertId);
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
            query += ' AND p.category_slug = ?';
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
    
    // Update product
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updateData)) {
            if (key === 'tags' || key === 'ingredients') {
                // Convert arrays to JSON strings
                fields.push(`${key} = ?`);
                values.push(JSON.stringify(value));
            } else if (key === 'price' || key === 'original_price') {
                // Convert to float
                fields.push(`${key} = ?`);
                values.push(parseFloat(value));
            } else if (key === 'category_id') {
                // Convert to integer
                fields.push(`${key} = ?`);
                values.push(parseInt(value));
            } else {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        // Always update updated_at
        fields.push('updated_at = NOW()');
        
        values.push(id);
        
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