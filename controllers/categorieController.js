const Categorie = require('../models/Categorie');

// --- Créer une catégorie ---
exports.createCategorie = async (req, res) => {
  try {
    const categorie = new Categorie({
      nom_cat: req.body.nom_cat,
      descriptions: req.body.descriptions || ''
    });

    await categorie.save();
    res.status(201).json(categorie);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la création de la catégorie",
      error: error.message
    });
  }
};

// --- Récupérer toutes les catégories ---
exports.getCategories = async (req, res) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token non fourni'
      });
    }

    const decodedToken = jwt.verify(token, config.jwtSecret);
    const role = decodedToken.role;

    if (role === 'Admin') {
      const categories = await Categorie.find().sort({ createdAt: -1 });
      res.json(categories);
    } else if (role === 'Boutique') {
      const boutique = await Boutique.findOne({ ownerId: decodedToken.id });
      res.json(boutique);
    } else if (role === 'Acheteur') {
      const categories = await Categorie.find().sort({ createdAt: -1 });
      res.json(categories);
    }
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors du chargement des catégories",
      error: error.message
    });
  }
};

// --- Récupérer une catégorie par ID ---
exports.getCategorieById = async (req, res) => {
  try {
    const categorie = await Categorie.findById(req.params.id);
    if (!categorie) {
      return res.status(404).json({ message: "Catégorie non trouvée" });
    }
    res.json(categorie);
  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur",
      error: error.message
    });
  }
};

// ---  Modifier une catégorie ---
exports.updateCategorie = async (req, res) => {
  try {
    const categorie = await Categorie.findByIdAndUpdate(
      req.params.id,
      {
        nom_cat: req.body.nom_cat,
        descriptions: req.body.descriptions
      },
      { new: true, runValidators: true }
    );

    if (!categorie) {
      return res.status(404).json({ message: "Catégorie non trouvée" });
    }

    res.json(categorie);
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la modification",
      error: error.message
    });
  }
};

// --- Supprimer une catégorie ---
exports.deleteCategorie = async (req, res) => {
  try {
    const categorie = await Categorie.findByIdAndDelete(req.params.id);
    if (!categorie) {
      return res.status(404).json({ message: "Catégorie non trouvée" });
    }

    res.json({ message: "Catégorie supprimée avec succès" });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression",
      error: error.message
    });
  }
};
