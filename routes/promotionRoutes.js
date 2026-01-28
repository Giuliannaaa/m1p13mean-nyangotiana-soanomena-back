const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotions');
const Promotions = require('../models/Promotions');
// Créer une promotion
router.post('/', async (req, res) => {
    try {
        const promotion = new Promotion(req.body);
        await promotion.save();
        res.status(201).json(promotion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
// Lire tous les promotions
router.get('/', async (req, res) => {
    try {
        const promotions = await Promotion.find();
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Mettre à jour un promotion
router.put('/:id', async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndUpdate(req.params.id,
        req.body, { new: true });
        res.json(promotion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
    });
    // Supprimer un promotion
    router.delete('/:id', async (req, res) => {
        try {
        await Promotion.findByIdAndDelete(req.params.id);
        res.json({ message: "Promotion supprimé" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;