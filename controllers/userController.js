const User = require('../models/User');

exports.getUsersByRole = async (req, res) => {
    try {
        const boutiqueUsers = await User.find({ role: 'Boutique' });
        res.json(boutiqueUsers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}