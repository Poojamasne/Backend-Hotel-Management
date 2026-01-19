const db = require('../config/database');

class Product {
    // Create product
    static async create(productData) {
        const { 
            name, description, price, original_price, category_id, 
            category_slug, image, type, tags, prep_time, 
            ingredients, is_popular, is_featured 
        } = productData;
        
        const [result] = await db.execute(
            `INSERT INTO products 
            (name, description, price, original_price, category_id, 
             category_slug, image, type, tags, prep_time, 
             ingredients, is_popular, is_featured) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, description, price, original_price, category_id,
                category_slug, image, type, tags, prep_time || '15-20 min',
                ingredients, is_popular || false, is_featured || false
            ]
        );
        
        return this.findById(result.insertId);
    }
    
    // Get all products with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT p.*, c.name as category_name, c.slug as category_slug 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.is_available = TRUE 
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
        
        // Sorting
        if (filters.sort_by) {
            const sortMap = {
                'price_low': 'p.price ASC',
                'price_high': 'p.price DESC',
                'popular': 'p.rating DESC',
                'newest': 'p.created_at DESC'
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
            fields.push(`${key} = ?`);
            values.push(value);
        }
        
        values.push(id);
        
        await db.execute(
            `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return this.findById(id);
    }
    
    // Delete product
    static async delete(id) {
        await db.execute(
            'UPDATE products SET is_available = FALSE WHERE id = ?',
            [id]
        );
        return true;
    }
    
    // Search products
    static async search(searchTerm) {
        const [rows] = await db.execute(
            `SELECT * FROM products 
             WHERE (name LIKE ? OR description LIKE ?) 
             AND is_available = TRUE 
             ORDER BY is_popular DESC, rating DESC 
             LIMIT 20`,
            [`%${searchTerm}%`, `%${searchTerm}%`]
        );
        return rows;
    }
}

module.exports = Product;