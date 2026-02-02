const express = require('express');
const multer = require('multer');
const router = express.Router();
const produitController = require('../controllers/produitController');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- Configuration Multer pour upload image ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // dossier upload
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Routes protégées avec Multer
router.post('/produits',
  protect,
  authorize('Admin', 'Boutique'),
  upload.single('image_Url'), // ← Multer en premier
  produitController.createProduit
);

router.get('/produits',
  protect,
  produitController.getProduits
);

router.get('/produits/:id',
  protect,
  produitController.getProduitById
);

router.put('/produits/:id',
  protect,
  authorize('Admin', 'Boutique'),
  upload.single('image_Url'), // ← Multer pour la modification aussi
  produitController.updateProduit
);

router.delete('/produits/:id',
  protect,
  authorize('Admin', 'Boutique'),
  produitController.deleteProduit
);

module.exports = router;