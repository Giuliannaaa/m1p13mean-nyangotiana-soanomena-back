const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect, authorize } = require('../middleware/authMiddleware');
const Boutique = require('../models/Boutique');

// ============================================
// ROUTES PUBLIQUES (SANS AUTHENTIFICATION)
// ============================================

router.get('/boutiques', messageController.getAllBoutiques);

// ============================================
// ROUTES AVEC AUTHENTIFICATION
// ============================================

// Récupérer le nombre de messages non lus - PROTÉGÉ
router.get('/non-lus/count', protect, messageController.getUnreadCount);

// TOUTES LES AUTRES ROUTES NÉCESSITENT UNE AUTHENTIFICATION
router.use(protect);

// ENVOYER UN MESSAGE
router.post('/envoyer', messageController.sendMessage);

// OBTENIR LE CONTACT D'UNE BOUTIQUE (pour démarrer une conversation)
router.get('/boutique/:boutique_id/contact', messageController.getBoutiqueContact);

// OBTENIR LES MESSAGES REÇUS
router.get('/recus', messageController.getReceivedMessages);

// OBTENIR LES MESSAGES ENVOYÉS
router.get('/envoyes', messageController.getSentMessages);

// OBTENIR TOUTES LES CONVERSATIONS
router.get('/conversations', messageController.getConversations);

// OBTENIR UNE CONVERSATION SPÉCIFIQUE - APRÈS /conversations pour éviter le conflit
router.get('/conversation/:otherUserId/:boutique_id', messageController.getConversation);

// MARQUER COMME LU
router.patch('/:messageId/lire', messageController.markAsRead);

// OBTENIR LA LISTE DES ADMINS
router.get('/admins', messageController.getAdmins);

// SUPPRIMER UN MESSAGE
router.delete('/:messageId', messageController.deleteMessage);

// SUPPRIMER UNE CONVERSATION
router.delete('/conversation/:otherUserId/:boutiqueId', messageController.deleteConversation);

module.exports = router;