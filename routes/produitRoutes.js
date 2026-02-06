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

// ✅ CREATE - Admin ET Boutique peuvent créer des produits
router.post('/produits',
  protect,
  authorize('Admin', 'Boutique'),  // ✅ Ajouter 'Boutique'
  upload.single('image_Url'),
  produitController.createProduit
);

// GET tous les produits (pas de protection)
router.get('/produits',
  produitController.getProduits
);

// GET produit par ID (pas de protection)
router.get('/produits/:id',
  produitController.getProduitById
);

// UPDATE - Admin ET Boutique peuvent modifier
router.put('/produits/:id',
  protect,
  authorize('Admin', 'Boutique'),
  upload.single('image_Url'),
  produitController.updateProduit
);

// DELETE - Admin ET Boutique peuvent supprimer
router.delete('/produits/:id',
  protect,
  authorize('Admin', 'Boutique'),
  produitController.deleteProduit
);

module.exports = router;