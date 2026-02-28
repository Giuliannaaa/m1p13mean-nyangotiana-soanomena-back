const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ============================================
// ROUTES SANS PARAMÈTRES
// ============================================

// Obtenir tous les utilisateurs qui ont le rôle boutique
router.get('/getUserShop', protect, userController.getUsersByRole);

// Obtenir tous les utilisateurs qui ont le rôle admin
router.get('/getAdminUsers', protect, authorize('Admin'), userController.getAdminUsers);

// Obtenir tous les utilisateurs qui ont le rôle acheteur
router.get('/getBuyerUsers', protect, authorize('Admin'), userController.getBuyerUsers);
// Document
router.get('/boutique-documents', protect, authorize('Admin'), userController.getBoutiqueUsersWithDocuments);

// ============================================
// ROUTES AVEC PARAMÈTRES - APRÈS les routes sans paramètres
// ============================================

// Récupérer le profil de l'utilisateur par ID
router.get('/:id', protect, userController.getUserById);

// Mettre à jour le profil de l'utilisateur
router.put('/:id', protect, userController.updateUserProfile);

// Valider ou invalider un utilisateur (Admin)
router.patch('/:id/toggle-validation', protect, authorize('Admin'), userController.toggleUserValidation);

router.post('/:id/request-delete', protect, userController.requestDeleteAccount);
router.post('/:id/cancel-delete', protect, userController.cancelDeleteAccount);

router.put('/:id/change-password', protect, userController.changePassword);

module.exports = router;