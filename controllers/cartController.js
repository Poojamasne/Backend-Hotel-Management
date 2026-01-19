const Cart = require('../models/Cart');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get cart items
    const items = await Cart.getUserCart(userId);
    
    // Get cart summary
    const summary = await Cart.calculateTotal(userId);
    
    res.json({
      success: true,
      data: {
        items: items,
        summary: summary
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching cart'
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;
    
    // Validate input
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }
    
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }
    
    // Add item to cart
    const items = await Cart.addToCart(userId, productId, quantity);
    
    // Get updated cart summary
    const summary = await Cart.calculateTotal(userId);
    
    // Get cart count for header
    const cartCount = await Cart.getCartCount(userId);
    
    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: {
        items: items,
        summary: summary,
        cartCount: cartCount
      }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding item to cart'
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Private
exports.updateCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;
    
    // Validate input
    if (!productId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and quantity are required'
      });
    }
    
    // Get the cart item ID first
    const cartItem = await Cart.getCartItemByProduct(userId, productId);
    
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    // Update cart item quantity
    const items = await Cart.updateQuantity(cartItem.id, userId, quantity);
    
    // Get updated cart summary
    const summary = await Cart.calculateTotal(userId);
    
    res.json({
      success: true,
      message: 'Cart updated successfully',
      data: {
        items: items,
        summary: summary
      }
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating cart'
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;
    
    // Get the cart item ID first
    const cartItem = await Cart.getCartItemByProduct(userId, productId);
    
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    // Remove item from cart
    const items = await Cart.removeItem(cartItem.id, userId);
    
    // Get updated cart summary
    const summary = await Cart.calculateTotal(userId);
    
    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: {
        items: items,
        summary: summary
      }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing item from cart'
    });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart/clear
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Clear the cart
    await Cart.clearCart(userId);
    
    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        items: [],
        summary: {
          item_count: 0,
          total_quantity: 0,
          subtotal: '0.00',
          delivery_charge: '0.00',
          tax: '0.00',
          total: '0.00'
        }
      }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while clearing cart'
    });
  }
};

// @desc    Get cart count (for header)
// @route   GET /api/cart/count
// @access  Private
exports.getCartCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cartCount = await Cart.getCartCount(userId);
    
    res.json({
      success: true,
      data: {
        cartCount: cartCount
      }
    });
  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting cart count'
    });
  }
};