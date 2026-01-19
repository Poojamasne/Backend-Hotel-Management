const ContactMessage = require('../models/ContactMessage');

// @desc    Create a new contact message
// @route   POST /api/contact
// @access  Public
exports.createContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const newMessage = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.',
      data: { id: newMessage.id }
    });
  } catch (error) {
    console.error('Error creating contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get all contact messages (admin)
// @route   GET /api/contact/messages
// @access  Private/Admin
// @desc    Get all contact messages (admin)
// @route   GET /api/contact/messages
// @access  Private/Admin
exports.getContactMessages = async (req, res) => {
  try {
    console.log('=== getContactMessages START ===');
    console.log('Query parameters:', req.query);
    console.log('User making request:', req.user);
    
    const { page = 1, limit = 10, status, search } = req.query;
    
    console.log('Calling ContactMessage.findAll with:', {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search
    });
    
    const result = await ContactMessage.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search
    });

    console.log('Result from ContactMessage.findAll:', result);
    
    res.json({
      success: true,
      data: result.messages,
      pagination: result.pagination
    });
    
    console.log('=== getContactMessages END ===');
  } catch (error) {
    console.error('=== ERROR in getContactMessages ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error sqlMessage:', error.sqlMessage);
    console.error('Error sqlState:', error.sqlState);
    
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Get single contact message (admin)
// @route   GET /api/contact/messages/:id
// @access  Private/Admin
exports.getContactMessageById = async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error fetching contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update message status (admin)
// @route   PUT /api/contact/messages/:id/status
// @access  Private/Admin
exports.updateMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const updated = await ContactMessage.updateStatus(req.params.id, status);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message status updated successfully'
    });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Delete contact message (admin)
// @route   DELETE /api/contact/messages/:id
// @access  Private/Admin
exports.deleteContactMessage = async (req, res) => {
  try {
    const deleted = await ContactMessage.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get contact statistics (admin dashboard)
// @route   GET /api/contact/stats
// @access  Private/Admin
exports.getContactStats = async (req, res) => {
  try {
    const stats = await ContactMessage.getStats();
    
    // Calculate totals
    const totalStats = {
      total: 0,
      unread: 0,
      read: 0,
      replied: 0,
      recent: stats
    };
    
    stats.forEach(stat => {
      totalStats.total += stat.total_messages || 0;
      totalStats.unread += stat.unread_count || 0;
      totalStats.read += stat.read_count || 0;
      totalStats.replied += stat.replied_count || 0;
    });

    res.json({
      success: true,
      data: totalStats
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};