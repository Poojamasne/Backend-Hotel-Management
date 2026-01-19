const db = require('../config/database');


class Order {
  // Create new order
static async create(orderData, userId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Generate unique order number
    const orderNumber = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
    
    // Convert undefined values to null for SQL
    const totalAmount = orderData.total_amount || orderData.subtotal || 0;
    const discountAmount = orderData.discount_amount || 0;
    const deliveryCharge = orderData.delivery_charge || 0;
    const taxAmount = orderData.tax_amount || orderData.tax || 0;
    const finalAmount = orderData.final_amount || orderData.total || 0;
    const deliveryType = orderData.delivery_type || 'home';
    const deliveryAddress = orderData.delivery_address || '';
    const paymentMethod = orderData.payment_method || 'cod';
    const paymentStatus = orderData.payment_status || 'pending';
    const orderStatus = orderData.order_status || 'pending';
    const promoCode = orderData.promo_code || null; // Convert to null if undefined
    const notes = orderData.notes || '';
    
    console.log('Creating order with data:', {
      orderNumber,
      userId,
      totalAmount,
      discountAmount,
      deliveryCharge,
      taxAmount,
      finalAmount,
      deliveryType,
      deliveryAddress,
      paymentMethod,
      paymentStatus,
      orderStatus,
      promoCode,
      notes
    });
    
    // Insert order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        order_number, user_id, total_amount, discount_amount,
        delivery_charge, tax_amount, final_amount, delivery_type,
        delivery_address, payment_method, payment_status, order_status,
        promo_code, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        userId,
        totalAmount,
        discountAmount,
        deliveryCharge,
        taxAmount,
        finalAmount,
        deliveryType,
        deliveryAddress,
        paymentMethod,
        paymentStatus,
        orderStatus,
        promoCode,  // This will be null if undefined
        notes
      ]
    );
    
    const orderId = orderResult.insertId;
    
    // Insert order items
    if (orderData.items && orderData.items.length > 0) {
      for (const item of orderData.items) {
        const productId = item.productId || null;
        const productName = item.name || '';
        const quantity = item.quantity || 0;
        const price = item.price || 0;
        const totalPrice = item.total || (item.price * item.quantity) || 0;
        
        console.log('Inserting order item:', {
          orderId,
          productId,
          productName,
          quantity,
          price,
          totalPrice
        });
        
        await connection.execute(
          `INSERT INTO order_items (
            order_id, product_id, product_name,
            quantity, price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            productId,
            productName,
            quantity,
            price,
            totalPrice
          ]
        );
      }
    }
    
    await connection.commit();
    
    return {
      id: orderId,
      order_number: orderNumber,
      items: orderData.items || []
    };
  } catch (error) {
    await connection.rollback();
    console.error('Error in Order.create:', error);
    throw error;
  } finally {
    connection.release();
  }
}

  // Get user's orders
  static async findByUser(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const [orders] = await db.execute(
      `SELECT o.*,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    
    // Get total count
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
      [userId]
    );
    
    const total = countResult[0].total;
    
    // Get items for each order
    for (let order of orders) {
      const [items] = await db.execute(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [order.id]
      );
      order.items = items;
    }
    
    return {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get order by ID
  static async findById(id, userId = null) {
    let query = 'SELECT * FROM orders WHERE id = ?';
    const params = [id];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    const [orders] = await db.execute(query, params);
    
    if (orders.length === 0) return null;
    
    const order = orders[0];
    
    // Get order items
    const [items] = await db.execute(
      `SELECT oi.*, p.image, p.description
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE order_id = ?`,
      [id]
    );
    
    order.items = items;
    
    return order;
  }

  // Get order by order number
  static async findByOrderNumber(orderNumber, userId = null) {
    let query = 'SELECT * FROM orders WHERE order_number = ?';
    const params = [orderNumber];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    const [orders] = await db.execute(query, params);
    
    if (orders.length === 0) return null;
    
    const order = orders[0];
    
    // Get order items
    const [items] = await db.execute(
      `SELECT oi.*, p.image, p.description
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE order_id = ?`,
      [order.id]
    );
    
    order.items = items;
    
    return order;
  }

  // Update order status
  static async updateStatus(id, status, userId = null) {
    let query = 'UPDATE orders SET order_status = ?, updated_at = NOW() WHERE id = ?';
    const params = [status, id];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    const [result] = await db.execute(query, params);
    return result.affectedRows > 0;
  }

  // Update payment status
  static async updatePaymentStatus(id, status) {
    const [result] = await db.execute(
      'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

  // Cancel order (user)
  static async cancel(id, userId) {
    const [result] = await db.execute(
      `UPDATE orders 
       SET order_status = 'cancelled', updated_at = NOW()
       WHERE id = ? AND user_id = ? AND order_status IN ('pending', 'confirmed')`,
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  // Get all orders (admin)
  static async findAll(page = 1, limit = 20, filters = {}) {
    let query = `SELECT o.*, 
                 u.name as user_name, u.email as user_email, u.phone as user_phone,
                 (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
                 FROM orders o
                 LEFT JOIN users u ON o.user_id = u.id`;
    let countQuery = `SELECT COUNT(*) as total FROM orders o`;
    const whereClauses = [];
    const params = [];
    const countParams = [];

    // Apply filters
    if (filters.status) {
      whereClauses.push('o.order_status = ?');
      params.push(filters.status);
      countParams.push(filters.status);
    }
    
    if (filters.payment_status) {
      whereClauses.push('o.payment_status = ?');
      params.push(filters.payment_status);
      countParams.push(filters.payment_status);
    }
    
    if (filters.start_date) {
      whereClauses.push('DATE(o.created_at) >= ?');
      params.push(filters.start_date);
      countParams.push(filters.start_date);
    }
    
    if (filters.end_date) {
      whereClauses.push('DATE(o.created_at) <= ?');
      params.push(filters.end_date);
      countParams.push(filters.end_date);
    }
    
    if (filters.search) {
      whereClauses.push('(o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Add WHERE clause if needed
    if (whereClauses.length > 0) {
      const whereClause = ' WHERE ' + whereClauses.join(' AND ');
      query += whereClause;
      countQuery += whereClause.replace(/o\./g, 'o.');
    }

    // Add sorting and pagination
    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    // Execute queries
    const [orders] = await db.execute(query, params);
    const [countResult] = await db.execute(countQuery, countParams);
    
    const total = countResult[0].total;

    return {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get order statistics
  static async getStats() {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(final_amount) as total_revenue,
        AVG(final_amount) as avg_order_value,
        COUNT(CASE WHEN order_status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN order_status = 'confirmed' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN order_status = 'preparing' THEN 1 END) as preparing_orders,
        COUNT(CASE WHEN order_status = 'ready' THEN 1 END) as ready_orders,
        COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_orders,
        COUNT(CASE WHEN DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 1 END) as yesterday_orders
      FROM orders
    `);
    
    const [recentOrders] = await db.execute(`
      SELECT o.*, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);
    
    const [topProducts] = await db.execute(`
      SELECT 
        oi.product_id,
        oi.product_name,
        COUNT(oi.id) as total_orders,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue
      FROM order_items oi
      GROUP BY oi.product_id, oi.product_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `);
    
    return {
      ...stats[0],
      recent_orders: recentOrders,
      top_products: topProducts
    };
  }

  // Get dashboard stats for user
  static async getUserStats(userId) {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(final_amount) as total_spent,
        COUNT(CASE WHEN order_status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) as delivered_orders
      FROM orders
      WHERE user_id = ?
    `, [userId]);
    
    const [recentOrders] = await db.execute(`
      SELECT * FROM orders 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 3
    `, [userId]);
    
    return {
      ...stats[0],
      recent_orders: recentOrders
    };
  }
}

module.exports = Order;