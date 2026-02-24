const express = require('express');
const router = express.Router();
const achatController = require('../controllers/achatController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ============================================
// TOUTES LES ROUTES SONT PROTÉGÉES
// ============================================

router.use(protect);

// ============================================
// ROUTES SANS PARAMÈTRES - EN PREMIER
// ============================================

// Récupérer le nombre d'achats non traités
router.get('/unread-count', achatController.getUnreadCount);

// Récupérer tous les achats
router.get('/', achatController.getAchats);

// ============================================
// ROUTES POST
// ============================================

// Créer un achat
router.post('/ajouter/:prod_id', authorize('Acheteur'), achatController.createAchat);
router.post('/', authorize('Acheteur'), achatController.createAchat);

// ============================================
// ROUTES GET SPÉCIFIQUES - AVANT /:id
// ============================================

// Récupérer les achats par boutique
router.get('/boutique/:store_id', authorize('Boutique', 'Admin'), achatController.getAchatsByBoutique);

// ============================================
// ROUTES PUT/PATCH - AVANT /:id
// ============================================

// Mettre à jour le statut
router.put('/update-status/:id', authorize('Acheteur', 'Boutique', 'Admin'), achatController.updateOrderStatus);

// ============================================
// ROUTES AVEC :id - EN DERNIER
// ============================================

// Récupérer un achat par ID
router.get('/:id', achatController.getAchatById);

// Supprimer un achat
router.delete('/:id', achatController.deleteAchat);

module.exports = router;