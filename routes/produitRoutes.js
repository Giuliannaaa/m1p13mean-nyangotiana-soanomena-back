const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const router = express.Router();
const Produit = require('../models/Produits');

// --- Configuration Multer pour upload image ---
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/'); // dossier upload
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// --- Ajouter un produit ---
router.post('/produits', upload.single('image_Url'), async (req, res) => {
  try {
    const livraison = req.body.livraison 
      ? JSON.parse(req.body.livraison) 
      : { disponibilite: false, frais: 0 };

    const produit = new Produit({
      store_id: req.body.store_id || null,
      nom_prod: req.body.nom_prod,
      descriptions: req.body.descriptions,
      prix_unitaire: mongoose.Types.Decimal128.fromString(req.body.prix_unitaire),
      stock_etat: req.body.stock_etat === 'true',
      type_produit: req.body.type_produit,
      livraison: livraison,
      image_Url: req.file ? req.file.path : ''
    });

    await produit.save();
    res.status(201).json({ message: 'Produit ajouté avec succès', produit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// --- Lire tous les produits ---
router.get('/', async (req, res) => {
  try {
    const produits = await Produit.find();
    res.json(produits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Lire un produit par ID ---
router.get('/produits/:id', async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id);
    if (!produit) return res.status(404).json({ message: "Produit non trouvé" });
    res.json(produit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Modifier un produit ---
router.put('/produits/:id', upload.single('image_Url'), async (req, res) => {
  try {
    if (req.body.livraison && typeof req.body.livraison === 'string') {
      req.body.livraison = JSON.parse(req.body.livraison);
    }
    if (req.file) {
      req.body.image_Url = req.file.path;
    }

    const produit = await Produit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(produit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// --- Supprimer un produit ---
router.delete('/produits/:id', async (req, res) => {
  try {
    await Produit.findByIdAndDelete(req.params.id);
    res.json({ message: "Produit supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
