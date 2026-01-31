const express = require('express');
const router = express.Router();
const achatController = require('../controllers/achatController');

// --- Routes ---
// CREATE achat
router.post('/', achatController.createAchat);

// GET tous les achats
router.get('/', achatController.getAchats);

// GET achat par ID
router.get('/:id', achatController.getAchatById);

// DELETE achat
router.delete('/:id', achatController.deleteAchat);

module.exports = router;
