const express = require("express");
const dotenv = require("dotenv");
const cors = require('cors');
const connectDB = require("./config/database");
const initUserAdmin = require("./utils/cron/initUserAdmin");
const authRoutes = require("./routes/authRoutes");
const produitRoutes = require("./routes/produitRoutes");
const promotionRoutes = require('./routes/promotionRoutes');
const achatRoutes = require('./routes/achatRoutes');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Make uploads folder static

// Enable CORS
app.use(cors({ origin: 'http://localhost:4200' }));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(PORT, () =>
            console.log(`Serveur démarré sur le port ${PORT}`)
        );

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err, promise) => {
            console.log(`Error: ${err.message}`);
            // Close server & exit process
            server.close(() => process.exit(1));
        });

        // Create admin user

    } catch (error) {
        console.log("Failed to connect to the database. Server shutting down.");
        process.exit(1);
    }
};


// Mount routers
app.use("/api/auth", authRoutes);
app.use("/api", produitRoutes);

//Route utilisateur
app.use('/users', require('./routes/userRoutes'));

/**--- CRUD --- */
// Route Categorie
app.use('/categories', require('./routes/categorieRoute'));
// Route Promotion
app.use('/', promotionRoutes);
//app.use('/api', promotionRoutes);

//Route Boutique
app.use('/boutiques', require('./routes/boutiqueRoutes'));
//Route Achat
app.use('/achats', achatRoutes); //tsy atao route fa api

// Route Admin Dashboard
app.use('/admin-dashboard', require('./routes/adminDashboardRoutes'));

startServer();
initUserAdmin();
