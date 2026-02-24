const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

// ============================================
// ROUTES SANS PARAMÈTRES - AVANT les routes avec :id
// ============================================

// Obtenir les promotions actives (pour le dashboard)
router.get('/actives', promotionController.getActivePromotions);

// Récupérer toutes les promotions (pour affichage client/admin)
router.get('/', promotionController.getPromotions);

// ============================================
// ROUTES AVEC PARAMÈTRES - APRÈS les routes sans paramètres
// ============================================

// Récupérer la promotion active pour un produit SPÉCIFIQUE
// DOIT VENIR APRÈS le GET /
router.get('/active/:prod_id', promotionController.getPromotionActiveByProduit);

// Récupérer UNE promotion par ID
router.get('/:id', promotionController.getPromotionById);

// ============================================
// CRUD ROUTES - POST, PUT, DELETE
// ============================================

// Créer une nouvelle promotion
router.post('/', promotionController.createPromotion);

// Modifier une promotion
router.put('/:id', promotionController.updatePromotion);

// Supprimer une promotion
router.delete('/:id', promotionController.deletePromotion);

// Activer / désactiver une promotion
router.patch('/:id/status', promotionController.togglePromotionStatus);

module.exports = router;