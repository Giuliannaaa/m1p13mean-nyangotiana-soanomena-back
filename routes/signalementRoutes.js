const express = require('express');
const router = express.Router();
const signalementController = require('../controllers/signalementController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ==========================================
// ROUTES PUBLIQUES (Acheteur)
// ==========================================

// CRÉER UN SIGNALEMENT (Acheteur)
router.post('/creer', protect, signalementController.creerSignalement);

// OBTENIR MON SIGNALEMENT POUR UN PRODUIT (Acheteur)
router.get('/mon-signalement/:produit_id', protect, signalementController.getMonSignalement);

// OBTENIR MES SIGNALEMENTS (Acheteur)
router.get('/acheteur/mes-signalements', protect, signalementController.getMesSignalements);

// ==========================================
// ROUTES BOUTIQUE
// ==========================================

// BOUTIQUE : Obtenir les signalements reçus par ses produits
// Le backend récupère l'ID de la boutique du user connecté
router.get('/boutique/mes-signalements', protect, signalementController.getSignalementsBoutique);

// ==========================================
// ROUTES ADMIN ONLY
// ==========================================

// Obtenir TOUS les signalements
router.get('/admin/tous', protect, authorize('Admin'), signalementController.getTousSignalements);

// Admin : Obtenir les signalements d'une boutique spécifique (par ID)
router.get('/admin/boutique/:boutique_id', protect, authorize('Admin'), signalementController.getSignalementsBoutiqueAdmin);

// Admin : Mettre à jour le statut d'un signalement
router.patch('/admin/:signalement_id/status', protect, authorize('Admin'), signalementController.updateStatusSignalement);

// Admin : Supprimer un signalement
router.delete('/admin/:signalement_id', protect, authorize('Admin'), signalementController.supprimerSignalement);

// Admin : Obtenir les statistiques
router.get('/admin/stats', protect, authorize('Admin'), signalementController.getStatistiquesSignalements);

module.exports = router;