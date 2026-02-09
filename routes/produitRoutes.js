const express = require('express');
const router = express.Router();
const produitController = require('../controllers/produitController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ========== Routes Principales ==========

// CREATE - Admin ET Boutique peuvent créer des produits
router.post('/produits',
  protect,
  authorize('Admin', 'Boutique'),
  produitController.createProduit
);

// GET tous les produits (pas de protection)
router.get('/produits',
  produitController.getProduits
);

// GET Nouveaux produits
router.get('/produits/filter/new',
  produitController.getNewProduits
);

// GET Produits populaires
router.get('/produits/filter/popular',
  produitController.getPopularProduits
);

// GET Produits best-seller
router.get('/produits/filter/bestseller',
  produitController.getBestSellerProduits
);

// GET Produits en promotion
router.get('/produits/filter/promoted',
  produitController.getPromotedProduits
);

// GET produit par ID (DOIT ETRE APRES les routes /filter/xxx)
router.get('/produits/:id',
  produitController.getProduitById
);

// UPDATE - Admin ET Boutique peuvent modifier
router.put('/produits/:id',
  protect,
  authorize('Admin', 'Boutique'),
  produitController.updateProduit
);

// DELETE - Admin ET Boutique peuvent supprimer
router.delete('/produits/:id',
  protect,
  authorize('Admin', 'Boutique'),
  produitController.deleteProduit
);

module.exports = router;