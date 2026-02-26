const express = require("express");
const dotenv = require("dotenv");
const cors = require('cors');
const connectDB = require("./config/database");
const fileUpload = require('express-fileupload');
const setupRoutes = require('./routes/index');
const initUserAdmin = require("./utils/cron/initUserAdmin");
const deleteExpiredAccounts = require("./utils/cron/deleteExpiredAccounts");

// NOTE: Les tâches cron (initUserAdmin, deleteExpiredAccounts) ne sont pas
// compatibles avec l'environnement serverless de Vercel. À migrer vers
// Vercel Cron Jobs ou un service externe si nécessaire.

dotenv.config();

const app = express();

// 1. CORS Configuration
const allowedOrigins = [
    'http://localhost:4200',
    // process.env.FRONTEND_URL || 'https://m1p13mean-nyangotiana-soanomena-fro.vercel.app',
];

app.use(cors({
    origin: function (origin, callback) {
        // Autoriser les requêtes sans origin (ex: Postman, curl, serveur-à-serveur)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.options('*', cors());

// fileUpload AVANT body-parser
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 },
    parseNested: true
}));

// Body parser SEULEMENT pour non-multipart
app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.startsWith('multipart/form-data')) {
        return next(); // laisser fileUpload gérer
    }
    express.json({ limit: '50mb' })(req, res, (err) => {
        if (err) return next(err);
        express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
    });
});

app.use('/uploads', express.static('uploads'));

const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(process.env.PORT || 5000, () =>
            console.log(`Serveur démarré sur le port ${process.env.PORT || 5000}`)
        );
        initUserAdmin();
        deleteExpiredAccounts();
        process.on('unhandledRejection', (err, promise) => {
            console.log(`Error: ${err.message}`);
            server.close(() => process.exit(1));
        });
    } catch (error) {
        console.log("Failed to connect to the database. Server shutting down.");
        process.exit(1);
    }
};

// Middleware de connexion MongoDB (lazy connection pour serverless)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection failed:', error.message);
        res.status(500).json({ success: false, message: 'Database connection failed' });
    }
});

// Injection de dépendances, appel de toutes les routes en une fonction
setupRoutes(app);

startServer();
deleteExpiredAccounts();

// Export pour Vercel (serverless) – PAS de app.listen()
module.exports = app;