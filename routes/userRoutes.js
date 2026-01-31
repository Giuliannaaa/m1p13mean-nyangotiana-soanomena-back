const express = require('express');
const router = express.Router();
const { getUsersByRole, toggleUserValidation, getAdminUsers, getBuyerUsers } = require('../controllers/userController');

// Obtenir tous les utilisateurs qui ont le rôle boutique
router.get('/getUserShop', getUsersByRole);

// Valider ou invalider un utilisateur
router.patch('/:id/toggle-validation', toggleUserValidation);

// Obtenir tous les utilisateurs qui ont le rôle admin
router.get('/getAdminUsers', getAdminUsers);

// Obtenir tous les utilisateurs qui ont le rôle acheteur
router.get('/getBuyerUsers', getBuyerUsers);

module.exports = router;
