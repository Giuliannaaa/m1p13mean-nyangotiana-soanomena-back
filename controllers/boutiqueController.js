const Boutique = require('../models/Boutique');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// --- Créer une boutique ---
exports.createBoutique = async (req, res) => {
    try {
        const boutique = new Boutique(req.body);
        await boutique.save();
        res.status(201).json(boutique);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// --- Récupérer toutes les boutiques ---
exports.getBoutiques = async (req, res) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Vérifier si le token existe
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token non fourni'
            });
        }

        const decodedToken = jwt.verify(token, config.jwtSecret);
        const role = decodedToken.role;

        if (role === 'Admin') {
            const boutiques = await Boutique.find();
            res.json(boutiques);
        } else if (role === 'Boutique') {
            const boutique = await Boutique.findOne({ ownerId: decodedToken.id });
            res.json(boutique);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Récupérer une boutique par ID ---
exports.getBoutiqueById = async (req, res) => {
    try {
        const boutique = await Boutique.findById(req.params.id);
        if (!boutique) return res.status(404).json({ message: "Boutique non trouvée" });
        res.json(boutique);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Mettre à jour une boutique ---
exports.updateBoutique = async (req, res) => {
    try {
        const boutique = await Boutique.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!boutique) return res.status(404).json({ message: "Boutique non trouvée" });
        res.json(boutique);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// --- Supprimer une boutique ---
exports.deleteBoutique = async (req, res) => {
    try {
        const boutique = await Boutique.findByIdAndDelete(req.params.id);
        if (!boutique) return res.status(404).json({ message: "Boutique non trouvée" });
        res.json({ message: "Boutique supprimée avec succès" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// --- Activer ou désactiver une boutique ---
exports.toggleBoutiqueStatus = async (req, res) => {
    try {
        const boutique = await Boutique.findById(req.params.id);
        if (!boutique) return res.status(404).json({ message: "Boutique non trouvée" });

        boutique.isValidated = !boutique.isValidated;
        await boutique.save();

        res.json({
            message: `Boutique ${boutique.isValidated ? 'activée' : 'désactivée'} avec succès`,
            isValidated: boutique.isValidated
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
/**
 * Récupérer la boutique par propriétaire (ownerId)
 */
exports.getBoutiqueByOwner = async (req, res) => {
    try {
        const boutique = await Boutique.findOne({ ownerId: req.params.ownerId });

        if (!boutique) {
            return res.status(404).json({
                success: false,
                message: 'Aucune boutique trouvée pour cet utilisateur'
            });
        }

        res.json({
            success: true,
            data: boutique
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
