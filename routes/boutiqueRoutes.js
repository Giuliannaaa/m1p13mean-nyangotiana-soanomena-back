const express = require('express');
const router = express.Router();
const { 
  createBoutique, 
  getBoutiques, 
  getBoutiqueById, 
  getBoutiqueByOwner, 
  updateBoutique, 
  deleteBoutique, 
  toggleBoutiqueStatus,
  // ✅ Ajouter les nouvelles méthodes
  getNewBoutiques,
  getPopularBoutiques,
  getFeaturedBoutiques,
  getTopRatedBoutiques,
  addFollower,
  rateBoutique
} = require('../controllers/boutiqueController');

// --- Créer une boutique ---
router.post('/', createBoutique);

// --- Récupérer toutes les boutiques ---
router.get('/', getBoutiques);

// LES FILTRES DOIVENT ÊTRE AVANT /:id
// --- Filtres de boutiques ---
router.get('/filter/new', getNewBoutiques);
router.get('/filter/popular', getPopularBoutiques);
router.get('/filter/featured', getFeaturedBoutiques);
router.get('/filter/top-rated', getTopRatedBoutiques);

// --- Récupérer une boutique par ownerId ---
router.get('/owner/:ownerId', getBoutiqueByOwner);

// --- Récupérer une boutique par ID ---
router.get('/:id', getBoutiqueById);

// --- Mettre à jour une boutique ---
router.put('/:id', updateBoutique);

// --- Supprimer une boutique ---
router.delete('/:id', deleteBoutique);

// --- Activer ou désactiver une boutique ---
router.patch('/:id/toggle-status', toggleBoutiqueStatus);

// NOUVELLES ROUTES
// --- Ajouter un follower ---
router.post('/:id/follow', addFollower);

// --- Noter une boutique ---
router.post('/:id/rate', rateBoutique);

module.exports = router;