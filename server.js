const express = require("express");
const dotenv = require("dotenv");
const cors = require('cors');
const connectDB = require("./config/database");
const initUserAdmin = require("./utils/cron/initUserAdmin");
const authRoutes = require("./routes/authRoutes");
const produitRoutes = require("./routes/produitRoutes");
const promotionRoutes = require('./routes/promotionRoutes');
const achatRoutes = require('./routes/achatRoutes');
const fileUpload = require('express-fileupload');
const suiviRoutes = require('./routes/suiviRoutes');
const avisRoutes = require('./routes/avisRoutes');
const signalRoutes = require('./routes/signalementRoutes');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.use(fileUpload({
    createParentPath: true,
    limits: {
        fileSize: 50 * 1024 * 1024
    },
    parseNested: true
}));

// Enable CORS
app.use(cors({ origin: 'http://localhost:4200' }));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(PORT, () =>
            console.log(`Serveur démarré sur le port ${PORT}`)
        );

        process.on('unhandledRejection', (err, promise) => {
            console.log(`Error: ${err.message}`);
            server.close(() => process.exit(1));
        });
    } catch (error) {
        console.log("Failed to connect to the database. Server shutting down.");
        process.exit(1);
    }
};

// ========== MOUNT ROUTERS ==========

// Auth & Products
app.use("/api/auth", authRoutes);
app.use("/api", produitRoutes);

// Users
app.use('/users', require('./routes/userRoutes'));

// Categories
app.use('/categories', require('./routes/categorieRoute'));

// PROMOTIONS - AVEC LE BON PRÉFIXE
app.use('/promotions', promotionRoutes);

// Boutiques
app.use('/boutiques', require('./routes/boutiqueRoutes'));

// Achats
app.use('/achats', achatRoutes);

// Panier
app.use('/api/panier', require('./routes/panierRoutes'));

// Admin Dashboard
app.use('/admin-dashboard', require('./routes/adminDashboardRoutes'));

// Suivi (Follow)
app.use('/api/suivis', suiviRoutes);

// Avis (Reviews)
app.use('/api/avis', require('./routes/avisRoutes'));

// Signalements (Reports)
app.use('/api/signalements', require('./routes/signalementRoutes'));

// Messagerie (Messages)
app.use('/api/messages', require('./routes/messageRoutes'));

// Route Boutique Dashboard
app.use('/boutique-dashboard', require('./routes/boutiqueDashboardRoutes'));

startServer();
initUserAdmin();