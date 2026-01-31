const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

// CRUD promotions
router.post('/promotions', promotionController.createPromotion);
router.get('/promotions', promotionController.getPromotions);
router.get('/promotions/:id', promotionController.getPromotionById);
router.put('/promotions/:id', promotionController.updatePromotion);
router.delete('/promotions/:id', promotionController.deletePromotion);

// Activer / désactiver
router.patch('/promotions/:id/status', promotionController.togglePromotionStatus);

module.exports = router;
