const express = require('express');
const router = express.Router();
const { createBoutique, getBoutiques, getBoutiqueById, updateBoutique, deleteBoutique, toggleBoutiqueStatus } = require('../controllers/boutiqueController');


// --- Créer une boutique ---
router.post('/', createBoutique);

// --- Récupérer toutes les boutiques ---
router.get('/', getBoutiques);

// --- Récupérer une boutique par ID ---
router.get('/:id', getBoutiqueById);

// --- Mettre à jour une boutique ---
router.put('/:id', updateBoutique);

// --- Supprimer une boutique ---
router.delete('/:id', deleteBoutique);

// --- Activer ou désactiver une boutique ---
router.patch('/:id/toggle-status', toggleBoutiqueStatus);

module.exports = router;
