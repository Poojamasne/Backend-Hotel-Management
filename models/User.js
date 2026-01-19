const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // Create user
    static async create(userData) {
        const { name, email, password, phone, address } = userData;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, phone, address) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone, address]
        );
        
        return this.findById(result.insertId);
    }
    
    // Find user by email (including password for login)
    static async findByEmail(email) {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    }
    
    // Find user by ID (excluding password)
    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT id, name, email, phone, address, role, profile_image, is_active, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }
    
    // Update user
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updateData)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        
        values.push(id);
        
        await db.execute(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return this.findById(id);
    }
    
    // Verify password (not needed anymore - using bcrypt.compare directly)
    static async verifyPassword(email, password) {
        const user = await this.findByEmail(email);
        if (!user) return false;
        
        return await bcrypt.compare(password, user.password);
    }


    // Find all users (for admin)
static async findAll() {
    const [rows] = await db.execute(
        `SELECT id, name, email, phone, address, role, 
                profile_image, is_active, created_at, updated_at 
         FROM users 
         ORDER BY created_at DESC`
    );
    return rows;
}

// Find users with pagination (optional)
static async findAllPaginated(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const [rows] = await db.execute(
        `SELECT id, name, email, phone, address, role, 
                profile_image, is_active, created_at, updated_at 
         FROM users 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );
    
    // Get total count
    const [[{ total }]] = await db.execute(
        'SELECT COUNT(*) as total FROM users'
    );
    
    return {
        users: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
}

// Update user status (activate/deactivate)
static async updateStatus(id, is_active) {
    await db.execute(
        'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
        [is_active, id]
    );
    return this.findById(id);
}

// Update user role
static async updateRole(id, role) {
    await db.execute(
        'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
        [role, id]
    );
    return this.findById(id);
}

}

module.exports = User;