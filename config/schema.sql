-- 1. Create database
CREATE DATABASE IF NOT EXISTS food_website_db;
USE food_website_db;

-- 2. Users table (first because other tables reference it)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    address TEXT,
    role ENUM('user', 'admin') DEFAULT 'user',
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- 3. Categories table (no foreign keys)
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image VARCHAR(255),
    item_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active (is_active),
    INDEX idx_order (display_order)
);

-- 4. Products table (references categories)
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    category_id INT,
    category_slug VARCHAR(100),
    image VARCHAR(255) NOT NULL,
    type ENUM('veg', 'non-veg') NOT NULL,
    tags TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    prep_time VARCHAR(50) DEFAULT '15-20 min',
    ingredients TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    is_popular BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_category (category_id),
    INDEX idx_popular (is_popular),
    INDEX idx_available (is_available)
);

-- 5. Cart table (references users and products)
CREATE TABLE IF NOT EXISTS cart (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_item (user_id, product_id),
    INDEX idx_user (user_id)
);

-- 6. Orders table (references users)
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    delivery_charge DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    delivery_type ENUM('home', 'pickup') DEFAULT 'home',
    delivery_address TEXT,
    payment_method VARCHAR(50),
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    order_status ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
    promo_code VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (order_status),
    INDEX idx_order_number (order_number)
);

-- 7. Order items table (references orders and products)
CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT,
    product_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_order (order_id)
);

-- 8. Offers table (no foreign keys)
CREATE TABLE IF NOT EXISTS offers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    original_price DECIMAL(10,2),
    discounted_price DECIMAL(10,2),
    time_left VARCHAR(50),
    is_veg BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_orders INT DEFAULT 0,
    tags TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active)
);

-- 9. Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    usage_limit INT,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_active (is_active)
);

-- 10. Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    subject VARCHAR(200),
    message TEXT NOT NULL,
    status ENUM('unread', 'read', 'replied') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Insert default admin user (password: admin123)
-- Note: You need to generate a proper bcrypt hash for 'admin123'
-- For now, use this temporary password (admin123) and change it after first login
INSERT IGNORE INTO users (name, email, password, phone, role) VALUES 
('Admin User', 'admin@zonixtec.com', '$2a$10$YourHashedPasswordHere', '9876543210', 'admin');

-- 12. Insert sample categories
INSERT IGNORE INTO categories (name, slug, description, display_order) VALUES
('Vegetarian', 'veg', 'Pure vegetarian dishes', 1),
('Non-Vegetarian', 'non-veg', 'Chicken, mutton & seafood', 2),
('South Indian', 'south-indian', 'Dosas, idlis & traditional meals', 3),
('Starters', 'starters', 'Veg & non-veg starters', 4),
('Main Course', 'main-course', 'Hearty meals & curries', 5),
('Desserts', 'desserts', 'Sweet treats & desserts', 6),
('Beverages', 'beverages', 'Juices, shakes & drinks', 7);

-- 13. Insert sample products
INSERT IGNORE INTO products (name, description, price, category_id, category_slug, image, type, tags, prep_time) VALUES
('Masala Dosa', 'Crispy rice crepe with potato filling', 180, 3, 'south-indian', '/images/dishes/south-indian/masala-dosa.jpg', 'veg', '["Popular", "Spicy"]', '15 min'),
('Paneer Butter Masala', 'Cottage cheese in rich tomato gravy', 250, 1, 'veg', '/images/dishes/veg/paneer-butter-masala.jpg', 'veg', '["Best Seller", "Creamy"]', '20 min'),
('Chicken Biryani', 'Aromatic basmati rice with chicken pieces', 350, 2, 'non-veg', '/images/dishes/non-veg/chicken-biryani.jpg', 'non-veg', '["Popular", "Spicy"]', '30 min'),
('Veg Spring Roll', 'Crispy rolls with vegetable filling', 150, 4, 'starters', '/images/dishes/starters/veg-spring-roll.jpg', 'veg', '["Crispy", "Snack"]', '10 min'),
('Chocolate Lava Cake', 'Warm chocolate cake with molten center', 120, 6, 'desserts', '/images/dishes/desserts/chocolate-lava-cake.jpg', 'veg', '["Sweet", "Chocolate"]', '12 min'),
('Mango Shake', 'Fresh mango shake with cream', 90, 7, 'beverages', '/images/dishes/beverages/mango-shake.jpg', 'veg', '["Fresh", "Summer"]', '5 min');

-- 14. Insert sample offers
INSERT IGNORE INTO offers (title, description, original_price, discounted_price, time_left, is_veg, rating, tags) VALUES
('Family Combo Offer', 'Perfect meal for family of 4', 1200, 899, '24:00:00', TRUE, 4.5, '["Family", "Combo", "Popular"]'),
('Lunch Special', 'Complete lunch with dessert', 450, 350, '18:00:00', TRUE, 4.2, '["Lunch", "Discount"]'),
('Weekend Buffet', 'Unlimited buffet with live counters', 800, 650, '48:00:00', TRUE, 4.7, '["Buffet", "Weekend"]');

-- 15. Insert sample promo codes
INSERT IGNORE INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit) VALUES
('WELCOME10', '10% off on first order', 'percentage', 10, 500, 200, 100),
('SAVE20', 'Flat ₹200 off on ₹1000+', 'fixed', 200, 1000, 200, 50),
('FREEDEL', 'Free delivery on any order', 'fixed', 49, 300, 49, 200);