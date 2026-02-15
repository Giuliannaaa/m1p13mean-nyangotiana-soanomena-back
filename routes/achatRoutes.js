const express = require('express');
const router = express.Router();
const achatController = require('../controllers/achatController');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- Routes Achats ---

// Toutes les routes sont protégées
router.use(protect);

// Routes POST (créations) - doivent venir EN PREMIER
router.post('/ajouter/:prod_id', authorize('Acheteur'), achatController.createAchat);
router.post('/', authorize('Acheteur'), achatController.createAchat);

// Routes GET spécifiques (avec noms de paramètres explicites) - AVANT les routes générales
router.get('/boutique/:store_id', authorize('Boutique', 'Admin'), achatController.getAchatsByBoutique);

// Routes GET générales
// getAchats sera filtré par rôle dans le contrôleur
router.get('/', achatController.getAchats);

// Route PATCH pour mettre à jour le statut
router.patch('/:id/status', authorize('Boutique', 'Admin'), achatController.updateOrderStatus);

// Routes GET/DELETE par ID (les plus générales) - EN DERNIER
router.get('/:id', achatController.getAchatById);
router.delete('/:id', authorize('Admin'), achatController.deleteAchat);

// Update achat status
router.put('/update-status/:id', authorize('Acheteur', 'Boutique', 'Admin'), achatController.updateOrderStatus);
router.patch('/:id/status', authorize('Acheteur', 'Boutique', 'Admin'), achatController.updateOrderStatus);

module.exports = router;