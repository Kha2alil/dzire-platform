// Import mysql2 library to connect to database
const mysql = require('mysql2');

// Import dotenv to read .env file
require('dotenv').config();

// Create Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,           // عنوان السيرفر / Server address
    port: process.env.DB_PORT,           // المنفذ / Port number
    user: process.env.DB_USER,           // اسم المستخدم / Username
    password: process.env.DB_PASSWORD,   // كلمة المرور / Password
    database: process.env.DB_NAME,       // اسم قاعدة البيانات / Database name
    waitForConnections: true,            // انتظر إذا كانت كل الاتصالات مشغولة
    connectionLimit: 10,                 // أقصى عدد للاتصالات = 10
    queueLimit: 0                        // لا حد لقائمة الانتظار
});

// Test database connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:');
        console.error(err.message);
        return;
    }
    
    console.log('✅ Database connected successfully!');
    connection.release(); // إرجاع الاتصال للـ Pool
});

// Export Pool to be used by other files
module.exports = pool.promise();