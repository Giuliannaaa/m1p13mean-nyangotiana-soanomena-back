const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // si tu utilises mkdirSync
const router = express.Router();
const produitController = require('../controllers/produitController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Configuration Multer pour upload temporaire
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '../uploads/produits/temp');
    
    // Créer le dossier temp s'il n'existe pas
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Filtrer pour accepter seulement les images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Seulement les images sont autorisées (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Max 5MB par image
});

//const upload = multer({ storage });

//const upload = multer({ storage: storage });

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