require('dotenv').config();
const mongoose = require('mongoose');

// Cache de connexion pour l'environnement serverless (Vercel)
// Évite de créer une nouvelle connexion à chaque invocation de fonction
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    // Réutiliser la connexion existante
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables. Please set it in your .env file or Vercel environment settings.');
  }

  try {
    console.log('- Connecting to MongoDB...');

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Options recommandées pour serverless
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`- MongoDB Connected: ${conn.connection.host}`);
    console.log(`- Database: ${conn.connection.name}`);

    // Handle connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error('- MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('- MongoDB disconnected');
      isConnected = false;
    });

  } catch (error) {
    isConnected = false;
    console.error('- MongoDB connection failed:', error.message);
    // En serverless, on lance une erreur plutôt que process.exit()
    throw error;
  }
};

module.exports = connectDB;