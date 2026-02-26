const express = require("express");
const dotenv = require("dotenv");
const cors = require('cors');
const connectDB = require("./config/database");
const fileUpload = require('express-fileupload');
const setupRoutes = require('./routes/index');
const initUserAdmin = require("./utils/cron/initUserAdmin");
const deleteExpiredAccounts = require("./utils/cron/deleteExpiredAccounts");

dotenv.config();

const app = express();

// 1. LOW LEVEL CORS & LOGGING (Run before everything else)
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Log for debugging (remove later if you want)
    console.log(`[CORS] Origin: ${origin || '(missing)'}, Method: ${req.method}`);

    const allowedOrigins = [
        'https://m1p13mean-nyangotiana-soanomena-fro.vercel.app',
        'http://localhost:4200',
    ];

    // For preflight or normal request
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

    // Always answer OPTIONS successfully (very important on Vercel)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

// 2. Middlewares
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 },
    parseNested: true
}));

app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.startsWith('multipart/form-data')) {
        return next();
    }
    express.json({ limit: '50mb' })(req, res, (err) => {
        if (err) return next(err);
        express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
    });
});

app.use('/uploads', express.static('uploads'));

// 3. Database connection middleware (Lazy connection for Serverless)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection failed:', error.message);
        res.status(500).json({ success: false, message: 'Database connection failed' });
    }
});

// 4. Routes
setupRoutes(app);

/**
 * Start server locally
 */
const startServer = async () => {
    try {
        await connectDB();
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Serveur démarré localement sur le port ${PORT}`);
            // Exécuter les tâches initiales localement
            initUserAdmin();
            deleteExpiredAccounts();
        });
    } catch (error) {
        console.error("Failed to connect to the database. Local server cannot start.");
        // Non-blocking for Vercel, but for local we might want to know
    }
};

// Start automatically ONLY if running directly (npm run dev / npm start)
if (require.main === module) {
    startServer();
}

// 5. Export for Vercel (serverless)
module.exports = app;