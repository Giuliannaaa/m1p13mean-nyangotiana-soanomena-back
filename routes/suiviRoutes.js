const express = require('express');
const router = express.Router();
const suiviController = require('../controllers/suiviController');
const { protect } = require('../middleware/authMiddleware'); // 

// TOUTES LES ROUTES NÉCESSITENT UNE AUTHENTIFICATION
router.use(protect);

// Suivre une boutique
router.post('/suivre', suiviController.suivreBoutique);

// Arrêter de suivre une boutique
router.delete('/arreter-suivi/:boutique_id', suiviController.arreterSuivreBoutique);

// Obtenir mes suivis (boutiques que je suis)
router.get('/mes-suivis', suiviController.getMesSuivis);

// Vérifier si je suis une boutique
router.get('/is-suivie/:boutique_id', suiviController.isBoutiqueSuivie);

// Obtenir le nombre de followers d'une boutique
router.get('/boutique/:boutique_id/followers', suiviController.getFollowersBoutique);

module.exports = router;