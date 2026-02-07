const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

// CRUD promotions
router.post('/promotions', promotionController.createPromotion);
router.get('/promotions', promotionController.getPromotions);

// Filtre promotion
router.get('/filter/promoted', promotionController.getPromotedProduits);

// TRÈS IMPORTANT : Cette route DOIT être AVANT /promotions/:id
//router.get('/promotions/active/:prod_id', promotionController.getPromotionActiveByProduit);

router.get('/promotions/active/:prod_id', promotionController.getPromotionActiveByProduit);
router.get('/', promotionController.getPromotions);

// Les routes avec :id doivent venir APRÈS les routes spécifiques
router.get('/promotions/:id', promotionController.getPromotionById);
router.put('/promotions/:id', promotionController.updatePromotion);
router.delete('/promotions/:id', promotionController.deletePromotion);

// Activer / désactiver
router.patch('/promotions/:id/status', promotionController.togglePromotionStatus);

module.exports = router;