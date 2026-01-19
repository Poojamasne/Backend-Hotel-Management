const db = require('../config/database');

class Category {
    // Find all categories
    static async findAll(activeOnly = false) {
        let query = 'SELECT * FROM categories';
        if (activeOnly) {
            query += ' WHERE is_active = 1';
        }
        query += ' ORDER BY display_order DESC, name ASC';
        
        const [rows] = await db.execute(query);
        return rows;
    }

    // Find category by ID
    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    // Find category by slug
    static async findBySlug(slug) {
        const [rows] = await db.execute(
            'SELECT * FROM categories WHERE slug = ? AND is_active = 1',
            [slug]
        );
        return rows[0] || null;
    }

    // Create a new category
    static async create(categoryData) {
        const { 
            name, 
            slug, 
            description, 
            image, 
            display_order, 
            item_count, 
            is_active 
        } = categoryData;
        
        const [result] = await db.execute(
            `INSERT INTO categories 
            (name, slug, description, image, display_order, item_count, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, 
                slug, 
                description, 
                image, 
                display_order || 0, 
                item_count || 0, 
                is_active || 1, 
                new Date(), 
                new Date()
            ]
        );
        
        return this.findById(result.insertId);
    }

    // Update a category
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        
        // Build dynamic update query
        for (const [key, value] of Object.entries(updateData)) {
            if (key === 'slug' && !value) {
                // Generate slug from name if not provided
                if (updateData.name) {
                    const slug = updateData.name.toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, '');
                    fields.push(`${key} = ?`);
                    values.push(slug);
                }
            } else if (value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        if (fields.length === 0) {
            return this.findById(id);
        }
        
        values.push(id);
        
        const query = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`;
        
        await db.execute(query, values);
        return this.findById(id);
    }

    // Delete a category
    static async delete(id) {
        await db.execute('DELETE FROM categories WHERE id = ?', [id]);
        return true;
    }
}

module.exports = Category;