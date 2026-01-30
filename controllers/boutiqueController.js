const Boutique = require('../models/Boutique');

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
        const boutiques = await Boutique.find();
        res.json(boutiques);
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
