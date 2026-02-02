const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('./models/User');
const Boutique = require('./models/Boutique');
const config = require('./config/config');

// Manually test the protect middleware logic
const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find a Boutique user
        const user = await User.findOne({ role: 'Boutique' });
        if (!user) {
            console.log('No Boutique user found in DB');
            process.exit(1);
        }
        console.log('Testing with user:', user.email, 'ID:', user._id);

        // Generate token
        const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret);
        console.log('Generated Token:', token);

        // Simulate middleware logic
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            console.log('Decoded:', decoded);

            const foundUser = await User.findById(decoded.id).select('-password');
            if (!foundUser) {
                console.log('User not found in middleware logic');
            } else {
                console.log('User found:', foundUser.email);

                if (foundUser.role === 'Boutique') {
                    console.log('Checking boutique for ownerId:', foundUser._id);
                    const boutique = await Boutique.findOne({ ownerId: foundUser._id });
                    console.log('Boutique found:', boutique ? boutique.name : 'None');
                }
            }
            console.log('✅ Middleware logic passed');
        } catch (err) {
            console.error('❌ Middleware logic failed:', err);
        }

    } catch (err) {
        console.error('DB Error:', err);
    } finally {
        await mongoose.connection.close();
    }
};

debug();
