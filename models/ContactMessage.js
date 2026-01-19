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
  // In models/ContactMessage.js - Update the findAll method
static async findAll({ page = 1, limit = 10, status = null, search = '' }) {
  try {
    console.log('findAll called with params:', { page, limit, status, search });
    
    let sql = `
      SELECT id, name, email, phone, subject, 
             LEFT(message, 100) as message_preview, 
             status, 
             DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM contact_messages
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter by status - only if status is provided and not 'all'
    if (status && status !== 'all' && status.trim() !== '') {
      sql += ` AND status = ?`;
      params.push(status);
    }
    
    // Search functionality - only if search is provided
    if (search && search.trim() !== '') {
      sql += ` AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Order
    sql += ` ORDER BY created_at DESC`;
    
    // Convert limit and offset to numbers
    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const offsetNum = (pageNum - 1) * limitNum;
    
    // IMPORTANT: For LIMIT and OFFSET, MySQL expects numbers
    // We'll NOT use prepared statements for these parameters
    sql += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    console.log('SQL Query:', sql);
    console.log('SQL Params:', params);
    
    const [messages] = await db.execute(sql, params);
    
    // Get total count for pagination - separate query
    let countSql = `SELECT COUNT(*) as total FROM contact_messages WHERE 1=1`;
    const countParams = [];
    
    if (status && status !== 'all' && status.trim() !== '') {
      countSql += ` AND status = ?`;
      countParams.push(status);
    }
    
    if (search && search.trim() !== '') {
      countSql += ` AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    console.log('Count SQL:', countSql);
    console.log('Count Params:', countParams);
    
    const [countResult] = await db.execute(countSql, countParams);
    const total = countResult[0]?.total || 0;
    
    console.log('Total messages found:', total);
    console.log('Messages retrieved:', messages.length);
    
    return {
      messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(total, 10),
        pages: Math.ceil(total / limitNum)
      }
    };
  } catch (error) {
    console.error('Error in ContactMessage.findAll:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
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