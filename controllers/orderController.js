const Order = require('../models/Order');
const Cart = require('../models/Cart');

// @desc    Create new order
// @route   POST /api/orders/create
// @access  Private
exports.createOrder = async (req, res) => {
  console.log('=== CREATE ORDER REQUEST ===');
  console.log('User ID:', req.user?.id);
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const userId = req.user.id;
    const {
      items,
      customerDetails = {},
      orderType = 'delivery',
      paymentMethod = 'cod',
      subtotal = 0,
      deliveryCharge = 0,
      tax = 0,
      total = 0,
      promoCode = null,
      notes = ''
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      console.log('Error: Cart is empty');
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate item structure
    const validItems = items.map(item => ({
      productId: item.productId || item.id || null,
      name: item.name || 'Unknown Product',
      price: item.price || 0,
      quantity: item.quantity || 1,
      total: item.total || (item.price || 0) * (item.quantity || 1)
    }));

    console.log('Validated items:', validItems);

    // Prepare order data with default values
    const orderData = {
      items: validItems,
      total_amount: subtotal,
      delivery_charge: deliveryCharge,
      tax_amount: tax,
      final_amount: total,
      delivery_type: orderType === 'delivery' ? 'home' : 'pickup',
      delivery_address: customerDetails?.address || '',
      payment_method: paymentMethod,
      promo_code: promoCode,
      notes: notes || customerDetails?.specialInstructions || '',
      payment_status: 'pending',
      order_status: 'pending'
    };

    console.log('Order data to create:', JSON.stringify(orderData, null, 2));

    // Create order
    console.log('Calling Order.create()...');
    const order = await Order.create(orderData, userId);
    console.log('Order created successfully:', order);

    // Clear user's cart after successful order
    try {
      console.log('Clearing cart for user:', userId);
      await Cart.clearCart(userId);
      console.log('Cart cleared successfully');
    } catch (cartError) {
      console.error('Error clearing cart after order:', cartError);
      // Don't fail the order if cart clearing fails
    }

    console.log('=== ORDER CREATION SUCCESSFUL ===');
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        items: order.items
      }
    });
  } catch (error) {
    console.error('=== ERROR CREATING ORDER ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const filters = {};
    if (status) filters.status = status;

    const result = await Order.findByUser(userId, page, limit);

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    const order = await Order.findById(orderId, userId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get order by order number
// @route   GET /api/orders/number/:orderNumber
// @access  Private
exports.getOrderByNumber = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderNumber = req.params.orderNumber;

    const order = await Order.findByOrderNumber(orderNumber, userId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    const cancelled = await Order.cancel(orderId, userId);

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled or not found'
      });
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get order status
// @route   GET /api/orders/:id/status
// @access  Private
exports.getOrderStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    const order = await Order.findById(orderId, userId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        status: order.order_status,
        payment_status: order.payment_status,
        updated_at: order.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user order statistics
// @route   GET /api/orders/stats/user
// @access  Private
exports.getUserOrderStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await Order.getUserStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ===================== ADMIN ROUTES ===================== //

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, payment_status, start_date, end_date, search } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (payment_status) filters.payment_status = payment_status;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (search) filters.search = search;

    const result = await Order.findAll(page, limit, filters);

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get order details (admin)
// @route   GET /api/orders/admin/:id
// @access  Private/Admin
exports.getOrderDetailsAdmin = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update order status (admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updated = await Order.updateStatus(orderId, status);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update payment status (admin)
// @route   PUT /api/orders/:id/payment-status
// @access  Private/Admin
exports.updatePaymentStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required'
      });
    }

    const validStatuses = ['pending', 'paid', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const updated = await Order.updatePaymentStatus(orderId, status);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get order statistics (admin)
// @route   GET /api/orders/stats/admin
// @access  Private/Admin
exports.getAdminOrderStats = async (req, res) => {
  try {
    const stats = await Order.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching admin order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get recent orders (admin dashboard)
// @route   GET /api/orders/recent
// @access  Private/Admin
exports.getRecentOrders = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await Order.findAll(1, limit);
    
    res.json({
      success: true,
      data: result.orders
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};