const express = require('express');
const router = express.Router();
const {
    getPanier,
    addToPanier,
    updateItemQuantity,
    removeFromPanier,
    clearPanier,
    validatePanier
} = require('../controllers/panierController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Tous les endpoints du panier nécessitent d'être connecté et d'avoir le rôle Acheteur
router.use(protect);
router.use(authorize('Acheteur'));

router.route('/')
    .get(getPanier);

router.route('/add')
    .post(addToPanier);

router.route('/update')
    .put(updateItemQuantity);

router.route('/remove/:productId')
    .delete(removeFromPanier);

router.route('/clear')
    .delete(clearPanier);

router.route('/validate')
    .post(validatePanier);

module.exports = router;
