require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('- MONGODB_URI is not defined in environment variables');
      console.log('- Make sure you have a .env file with MONGODB_URI set');
      process.exit(1);
    }

    console.log('- Connecting to MongoDB...');

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Obsolete in mongoose 6+
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`- MongoDB Connected: ${conn.connection.host}`);
    console.log(`- Database: ${conn.connection.name}`);

    // Handle connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error('- MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('- MongoDB disconnected');
    });

  } catch (error) {
    console.error('- MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;