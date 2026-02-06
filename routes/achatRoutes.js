const express = require('express');
const router = express.Router();
const achatController = require('../controllers/achatController');

// --- Routes Achats ---

// 1️⃣ Routes POST (créations) - doivent venir EN PREMIER
router.post('/ajouter/:prod_id', achatController.createAchat);
router.post('/', achatController.createAchat);

// 2️⃣ Routes GET spécifiques (avec noms de paramètres explicites) - AVANT les routes générales
router.get('/boutique/:store_id', achatController.getAchatsByBoutique);

// 3️⃣ Routes GET générales
router.get('/', achatController.getAchats);

// 4️⃣ Routes GET/DELETE par ID (les plus générales) - EN DERNIER
router.get('/:id', achatController.getAchatById);
router.delete('/:id', achatController.deleteAchat);

module.exports = router;