// Point d'entrée principal de l'application Node.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const connectDB = require('./config/database');
// connectDB() will be called in startServer


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connexion à MongoDB via config/database.js
// connectDB logic handled below

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
// app.use("/articles", require("./routes/articleRoutes"));

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

  } catch (error) {
    console.log("Failed to connect to the database. Server shutting down.");
    process.exit(1);
  }
};

startServer();
