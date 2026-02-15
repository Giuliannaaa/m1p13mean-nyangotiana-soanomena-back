const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Boutique = require('../models/Boutique');
const config = require('../config/config');

// Protect routes
exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Set token from Bearer token in header
        token = req.headers.authorization.split(' ')[1];
    }
    // else if (req.cookies.token) {
    //   token = req.cookies.token;
    // }

    // Make sure token exists
    if (!token) {
        return res.status(401).json({ success: false, error: 'Not authorized: No token provided in header' });
    }
    if (token === 'null') {
        return res.status(401).json({ success: false, error: 'Not authorized: Token is the string "null" - Check frontend storage' });
    }
    if (token === 'undefined') {
        return res.status(401).json({ success: false, error: 'Not authorized: Token is the string "undefined" - Check frontend storage' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authorized to access this route (user not found)' });
        }

        const role = decoded.role;

        // Si c'est un propriétaire de boutique, récupérer sa boutique
        if (role === 'Boutique' || role === 'boutique') {
            try {
                req.boutique = await Boutique.findOne({ ownerId: req.user._id });
            } catch (boutiqueError) {
                console.error('Error fetching boutique in middleware:', boutiqueError);
                // We don't necessarily want to block the whole request if boutique fetch fails, 
                // but for now let's just log it.
            }
        }

        next();
    } catch (err) {
        console.error('Auth Middleware Critical Error:', err); // Modified log for catch block
        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route',
            details: err.message // Changed to always include err.message
        });
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};
