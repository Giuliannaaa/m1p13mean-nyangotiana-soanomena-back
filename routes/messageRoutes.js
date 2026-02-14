const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect, authorize } = require('../middleware/authMiddleware');
const Boutique = require('../models/Boutique');


router.get('/boutiques', messageController.getAllBoutiques);

// TOUTES LES ROUTES NÉCESSITENT UNE AUTHENTIFICATION
router.use(protect);

// ENVOYER UN MESSAGE
router.post('/envoyer', messageController.sendMessage);

// OBTENIR LE CONTACT D'UNE BOUTIQUE (pour démarrer une conversation)
router.get('/boutique/:boutique_id/contact', messageController.getBoutiqueContact);

// OBTENIR LES MESSAGES REÇUS
router.get('/recus', messageController.getReceivedMessages);

// OBTENIR LES MESSAGES ENVOYÉS
router.get('/envoyes', messageController.getSentMessages);

// OBTENIR UNE CONVERSATION SPÉCIFIQUE
router.get('/conversation/:otherUserId/:boutique_id', messageController.getConversation);

// OBTENIR TOUTES LES CONVERSATIONS
router.get('/conversations', messageController.getConversations);

// MARQUER COMME LU
router.patch('/:messageId/lire', messageController.markAsRead);

// OBTENIR LE NOMBRE DE NON LUS
router.get('/non-lus/count', messageController.getUnreadCount);

// OBTENIR LA LISTE DES ADMINS
router.get('/admins', protect, messageController.getAdmins);

// SUPPRIMER UN MESSAGE
router.delete('/:messageId', messageController.deleteMessage);

// SUPPRIMER UNE CONVERSATION
router.delete('/conversation/:otherUserId/:boutiqueId', protect, messageController.deleteConversation);

module.exports = router;