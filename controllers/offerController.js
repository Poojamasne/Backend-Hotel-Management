const db = require('../config/database');

// @desc    Get all offers
// @route   GET /api/offers
exports.getAllOffers = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM offers WHERE is_active = TRUE ORDER BY created_at DESC'
        );
        
        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        console.error('Get offers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};