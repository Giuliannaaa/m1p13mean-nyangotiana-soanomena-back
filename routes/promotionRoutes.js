const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

// Obtenir les promotions actives (pour le dashboard)
router.get('/actives', promotionController.getActivePromotions);

// Récupérer la promotion active pour un produit SPÉCIFIQUE
router.get('/active/:prod_id', promotionController.getPromotionActiveByProduit);

// Obtenir TOUTES les promotions
router.get('/', promotionController.getPromotions);

// LES ROUTES AVEC :id DOIVENT VENIR APRÈS
router.get('/:id', promotionController.getPromotionById);

// CRUD promotions
router.post('/', promotionController.createPromotion);
router.put('/:id', promotionController.updatePromotion);
router.delete('/:id', promotionController.deletePromotion);

// Activer / désactiver
router.patch('/:id/status', promotionController.togglePromotionStatus);

module.exports = router;