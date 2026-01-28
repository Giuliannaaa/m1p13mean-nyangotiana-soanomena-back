const dotenv = require('dotenv');

// Load env vars
dotenv.config();

module.exports = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    mongoDbURI: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '30d',
    email: {
        host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
        port: process.env.SMTP_PORT || process.env.EMAIL_PORT,
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASS,
        fromName: process.env.FROM_NAME || 'Supermarket App',
        fromEmail: process.env.FROM_EMAIL || 'noreply@supermarket.com'
    }
};
