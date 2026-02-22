const express = require('express');
const router = express.Router();
const { createCategorie, getCategories, getCategorieById, updateCategorie, deleteCategorie } = require('../controllers/categorieController');

// --- Création d'une categorie --- 
router.post('/', createCategorie);

// --- Lire tous les categories ---
router.get('/', getCategories);

// --- Lire une categorie par ID ---
router.get('/:id', getCategorieById);

// --- Mettre à jour une categorie ---
router.put('/:id', updateCategorie);

// --- Supprimer une categorie ---
router.delete('/:id', deleteCategorie);

module.exports = router;