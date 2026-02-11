const express = require('express');
const router = express.Router();
const signalementController = require('../controllers/signalementController');
const { protect, authorize } = require('../middleware/authMiddleware');

// CRÉER UN SIGNALEMENT (Acheteur)
router.post('/creer', protect, signalementController.creerSignalement);

// OBTENIR MON SIGNALEMENT (Acheteur)
router.get('/mon-signalement/:produit_id', protect, signalementController.getMonSignalement);

// ADMIN ONLY
// Obtenir tous les signalements
router.get('/admin/tous', protect, authorize('Admin'), signalementController.getTousSignalements);

// OBTENIR MES SIGNALEMENTS (Acheteur)
router.get('/acheteur/mes-signalements', protect, signalementController.getMesSignalements);

// Obtenir les signalements d'une boutique
router.get('/admin/boutique/:boutique_id', protect, authorize('Admin'), signalementController.getSignalementsBoutique);

// Mettre à jour le statut
router.patch('/admin/:signalement_id/status', protect, authorize('Admin'), signalementController.updateStatusSignalement);

// Supprimer un signalement
router.delete('/admin/:signalement_id', protect, authorize('Admin'), signalementController.supprimerSignalement);

// Statistiques
router.get('/admin/stats', protect, authorize('Admin'), signalementController.getStatistiquesSignalements);

module.exports = router;