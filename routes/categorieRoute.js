const express = require('express');
const router = express.Router();
const Categorie = require('../models/Categorie');

// --- Création d'une categorie --- 
router.post('/', async (req, res) => {
    try {
        const categorie = new Categorie(req.body);
        await categorie.save();
        res.status(201).json(categorie);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// --- Lire tous les categories ---
router.get('/', async (req, res) => {
    try {
        const categories = await Categorie.find();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- Lire une categorie par ID ---
router.get('/:id', async (req, res) => {  // ← Enlevé '/categories'
    try {
        const categorie = await Categorie.findById(req.params.id);
        if (!categorie) return res.status(404).json({ message: "Categorie non trouvé" });
        res.json(categorie);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Mettre à jour une categorie ---
router.put('/:id', async (req, res) => {  // ← Enlevé '/categories'
    try {
        const categorie = await Categorie.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!categorie) return res.status(404).json({ message: "Categorie non trouvé" });
        res.json(categorie);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// --- Supprimer une categorie ---
router.delete('/:id', async (req, res) => {  // ← Enlevé '/categories'
    try {
        const categorie = await Categorie.findByIdAndDelete(req.params.id);
        if (!categorie) return res.status(404).json({ message: "Categorie non trouvé" });
        res.json({ message: "Categorie supprimé avec succès" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;