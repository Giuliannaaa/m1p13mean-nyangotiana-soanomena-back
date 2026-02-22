const express = require('express');
const router = express.Router();
const avisController = require('../controllers/avisController');
const { protect } = require('../middleware/authMiddleware');

// ROUTE PUBLIQUE - SANS AUTHENTIFICATION
router.get('/tous', avisController.getTousLesAvis);

// TOUTES LES AUTRES ROUTES NÉCESSITENT UNE AUTHENTIFICATION
router.use(protect);

// Noter une boutique
router.post('/noter', avisController.noterBoutique);

// Obtenir mon avis pour une boutique
router.get('/mon-avis/:boutique_id', avisController.getMonAvis);

// Obtenir tous les avis d'une boutique
router.get('/boutique/:boutique_id', avisController.getAvisBoutique);

// Supprimer un avis
router.delete('/:boutique_id', avisController.supprimerAvis);

module.exports = router;