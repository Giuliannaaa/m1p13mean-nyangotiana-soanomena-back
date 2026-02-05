const User = require('../models/User');
const Boutique = require('../models/Boutique');

exports.getUsersByRole = async (req, res) => {
    try {
        const boutiqueUsers = await User.find({ role: 'Boutique' });
        res.json(boutiqueUsers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.toggleUserValidation = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

        user.isActive = !user.isActive;

        // Si le rôle est Boutique, on désactive aussi les boutiques qu'il détient
        if (user.role === 'Boutique') {
            await Boutique.updateMany({ ownerId: user._id }, { isValidated: user.isActive });
        }

        await user.save();

        res.json({
            message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'} avec succès`,
            isActive: user.isActive
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAdminUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'Admin' });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBuyerUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'Acheteur' });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};