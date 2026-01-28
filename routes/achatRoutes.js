const express = require('express');
const router = express.Router();
const Achat = require('../models/Achat');
const Achats = require('../models/Achat');
// Créer un achat
router.post('/', async (req, res) => {
    try {
        const achat = new Achat(req.body);
        await achat.save();
        res.status(201).json(achat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
// Lire tous les achats
router.get('/', async (req, res) => {
    try {
        const achats = await Achat.find();
        res.json(achats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Mettre à jour un achat
router.put('/:id', async (req, res) => {
    try {
        const achat = await Achat.findByIdAndUpdate(req.params.id,
        req.body, { new: true });
        res.json(achat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
    });
    // Supprimer un achat
    router.delete('/:id', async (req, res) => {
        try {
        await Achat.findByIdAndDelete(req.params.id);
        res.json({ message: "Achat supprimé" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;