const bcrypt = require('bcryptjs');
const db = require('./database');

async function setupAdmin() {
    try {
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update admin password with proper hash
        const [result] = await db.execute(
            `UPDATE users 
             SET password = ? 
             WHERE email = 'admin@zonixtec.com'`,
            [hashedPassword]
        );
        
        if (result.affectedRows > 0) {
            console.log('✅ Admin password updated successfully');
            console.log('👤 Admin email: admin@zonixtec.com');
            console.log('🔑 Password: admin123');
        } else {
            // Insert new admin if not exists
            await db.execute(
                `INSERT INTO users (name, email, password, phone, role) 
                 VALUES (?, ?, ?, ?, ?)`,
                ['Admin User', 'admin@zonixtec.com', hashedPassword, '9876543210', 'admin']
            );
            console.log('✅ Admin user created successfully');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up admin:', error);
        process.exit(1);
    }
}

setupAdmin();