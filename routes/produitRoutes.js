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

// ROUTES PUBLIQUES D'ABORD (AVANT GET /produits/:id)

// GET Nouveaux produits
router.get('/produits/nouveau',
  produitController.getNewProduits
);

// GET Produits populaires
router.get('/produits/populaire',
  produitController.getPopularProduits
);

// GET Produits best-seller
router.get('/produits/best-sellers',
  produitController.getBestSellerProduits
);

// GET Produits en promotion
router.get('/produits/promo',
  produitController.getPromotedProduits
);

// GET tous les produits (pas de protection)
router.get('/produits',
  produitController.getProduits
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

// UPDATE - Boutique peuvent modifier le prix d'un produit
router.put('/produits/update-prix-produit/:id',
  protect,
  authorize('Boutique'),
  produitController.updateProductPrice
);

// DELETE - Admin ET Boutique peuvent supprimer
router.delete('/produits/:id',
  protect,
  authorize('Admin', 'Boutique'),
  produitController.deleteProduit
);

router.get('/produits/store/:store_id', produitController.getProduitOfStore);

module.exports = router;