const db = require('../config/database');

class Cart {
  // Get user's cart items
  static async getUserCart(userId) {
    const [items] = await db.execute(
      `SELECT ci.*, 
              p.name as product_name, 
              p.price, 
              p.image, 
              p.description,
              p.type,
              p.category_id,
              c.name as category_name
       FROM cart_items ci
       LEFT JOIN products p ON ci.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ci.user_id = ?
       ORDER BY ci.created_at DESC`,
      [userId]
    );
    return items;
  }

  // Add item to cart
  static async addToCart(userId, productId, quantity = 1) {
    // Check if item already exists in cart
    const [existing] = await db.execute(
      `SELECT * FROM cart_items 
       WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    if (existing.length > 0) {
      // Update quantity if item exists
      await db.execute(
        `UPDATE cart_items 
         SET quantity = quantity + ?, updated_at = NOW()
         WHERE user_id = ? AND product_id = ?`,
        [quantity, userId, productId]
      );
    } else {
      // Insert new item
      await db.execute(
        `INSERT INTO cart_items (user_id, product_id, quantity) 
         VALUES (?, ?, ?)`,
        [userId, productId, quantity]
      );
    }

    // Return updated cart
    return await this.getUserCart(userId);
  }

  // Update cart item quantity
  static async updateQuantity(cartItemId, userId, quantity) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      await this.removeItem(cartItemId, userId);
    } else {
      // Update quantity
      await db.execute(
        `UPDATE cart_items 
         SET quantity = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [quantity, cartItemId, userId]
      );
    }
    
    // Return updated cart
    return await this.getUserCart(userId);
  }

  // Remove item from cart
  static async removeItem(cartItemId, userId) {
    await db.execute(
      `DELETE FROM cart_items 
       WHERE id = ? AND user_id = ?`,
      [cartItemId, userId]
    );
    
    // Return updated cart
    return await this.getUserCart(userId);
  }

  // Clear user's cart
  static async clearCart(userId) {
    await db.execute(
      `DELETE FROM cart_items 
       WHERE user_id = ?`,
      [userId]
    );
  }

  // Get cart summary/total
  static async calculateTotal(userId) {
    const [result] = await db.execute(
      `SELECT 
         COUNT(*) as item_count,
         SUM(ci.quantity) as total_quantity,
         SUM(ci.quantity * p.price) as subtotal
       FROM cart_items ci
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?`,
      [userId]
    );
    
    const summary = result[0] || {};
    const subtotal = parseFloat(summary.subtotal) || 0;
    const itemCount = summary.item_count || 0;
    const totalQuantity = summary.total_quantity || 0;
    
    // Calculate delivery charge (free for orders above 500)
    const deliveryCharge = subtotal > 500 ? 0 : 49;
    
    // Calculate tax (5% GST)
    const tax = subtotal * 0.05;
    
    // Calculate total
    const total = subtotal + deliveryCharge + tax;
    
    return {
      item_count: itemCount,
      total_quantity: totalQuantity,
      subtotal: subtotal.toFixed(2),
      delivery_charge: deliveryCharge.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    };
  }

  // Get cart item by product ID
  static async getCartItemByProduct(userId, productId) {
    const [items] = await db.execute(
      `SELECT * FROM cart_items 
       WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );
    return items[0] || null;
  }

  // Get cart item count
  static async getCartCount(userId) {
    const [result] = await db.execute(
      `SELECT SUM(quantity) as total_count 
       FROM cart_items 
       WHERE user_id = ?`,
      [userId]
    );
    return result[0]?.total_count || 0;
  }
}

module.exports = Cart;