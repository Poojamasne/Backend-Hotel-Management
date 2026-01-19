const db = require('../config/database');

class ContactMessage {
  // Create a new contact message
  static async create({ name, email, phone, subject, message }) {
    const sql = `
      INSERT INTO contact_messages (name, email, phone, subject, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'unread', NOW())
    `;
    
    try {
      const [result] = await db.execute(sql, [name, email, phone, subject, message]);
      return { id: result.insertId };
    } catch (error) {
      throw new Error(`Error creating contact message: ${error.message}`);
    }
  }

  // Get all messages (for admin)
  static async findAll({ page = 1, limit = 10, status = null, search = '' }) {
    let sql = `
      SELECT id, name, email, phone, subject, 
             LEFT(message, 100) as message_preview, 
             status, 
             DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM contact_messages
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter by status
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    
    // Search functionality
    if (search) {
      sql += ` AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Order and pagination
    sql += ` ORDER BY created_at DESC`;
    
    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    try {
      const [messages] = await db.execute(sql, params);
      
      // Get total count for pagination
      const countSql = `
        SELECT COUNT(*) as total 
        FROM contact_messages 
        WHERE 1=1 ${status ? 'AND status = ?' : ''} ${search ? 'AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)' : ''}
      `;
      
      const countParams = [];
      if (status) countParams.push(status);
      if (search) {
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      const [countResult] = await db.execute(countSql, countParams);
      const total = countResult[0].total;
      
      return {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error fetching contact messages: ${error.message}`);
    }
  }

  // Get message by ID
  static async findById(id) {
    const sql = `
      SELECT id, name, email, phone, subject, message, status, 
             DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM contact_messages
      WHERE id = ?
    `;
    
    try {
      const [messages] = await db.execute(sql, [id]);
      return messages[0] || null;
    } catch (error) {
      throw new Error(`Error fetching contact message: ${error.message}`);
    }
  }

  // Update message status (admin only)
  static async updateStatus(id, status) {
    const validStatuses = ['unread', 'read', 'replied'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status value');
    }
    
    const sql = `
      UPDATE contact_messages 
      SET status = ? 
      WHERE id = ?
    `;
    
    try {
      const [result] = await db.execute(sql, [status, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating message status: ${error.message}`);
    }
  }

  // Delete message (admin only)
  static async delete(id) {
    const sql = `DELETE FROM contact_messages WHERE id = ?`;
    
    try {
      const [result] = await db.execute(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting contact message: ${error.message}`);
    }
  }

  // Get statistics (admin dashboard)
  static async getStats() {
    const sql = `
      SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread_count,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied_count,
        DATE(created_at) as date,
        COUNT(*) as daily_count
      FROM contact_messages
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    try {
      const [stats] = await db.execute(sql);
      return stats;
    } catch (error) {
      throw new Error(`Error fetching contact statistics: ${error.message}`);
    }
  }
}

module.exports = ContactMessage;