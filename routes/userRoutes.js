const express = require('express');
const router = express.Router();
const { getUsersByRole } = require('../controllers/userController');

// Obtenir tous les utilisateurs qui ont le rôle boutique
router.get('/getUserShop', getUsersByRole);

module.exports = router;
