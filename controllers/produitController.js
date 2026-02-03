const mongoose = require('mongoose');
const Produit = require('../models/Produits');
const Boutique = require('../models/Boutique');
const fs = require('fs'); // ← Ajouter
const path = require('path'); // ← Ajouter

/**
 * Créer le dossier pour un produit
 */
const createProductFolder = (productId) => {
  const productPath = path.join(__dirname, '../uploads/produits', productId.toString());
  
  if (!fs.existsSync(productPath)) {
    fs.mkdirSync(productPath, { recursive: true });
  }
  
  return productPath;
};

/**
 * Déplacer les images du dossier temp vers le dossier du produit
 */
const moveImagesToProductFolder = (files, productId) => {
  if (!files || files.length === 0) return [];
  
  const productPath = createProductFolder(productId);
  const imagePaths = [];
  
  files.forEach((file, index) => {
    const oldPath = file.path;
    const ext = path.extname(file.originalname);
    const newFilename = `image-${index}${ext}`;
    const newPath = path.join(productPath, newFilename);
    
    // Déplacer le fichier
    fs.renameSync(oldPath, newPath);
    
    // Stocker le chemin relatif (pour la base de données)
    imagePaths.push(`uploads/produits/${productId}/${newFilename}`);
  });
  
  return imagePaths;
};

/**
 * Créer un produit (associé à la boutique de l'utilisateur connecté)
 */
exports.createProduit = async (req, res) => {
  try {
    let store_id;

    // Gérer le store_id selon le rôle
    if (req.user && req.user.role === 'Boutique') {
      if (!req.boutique) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez d\'abord créer une boutique pour ajouter des produits'
        });
      }

      if (!req.boutique.isValidated) {
        return res.status(403).json({
          success: false,
          message: 'Votre boutique doit être validée pour ajouter des produits'
        });
      }

      store_id = req.boutique._id;
    } else if (req.user && req.user.role === 'Admin') {
      store_id = req.body.store_id;

      if (!store_id) {
        return res.status(400).json({
          success: false,
          message: 'L\'admin doit spécifier un store_id'
        });
      }
    }

    // Parser la livraison
    const livraison = req.body.livraison
      ? (typeof req.body.livraison === 'string'
        ? JSON.parse(req.body.livraison)
        : req.body.livraison)
      : { disponibilite: false, frais: 0 };

    // Créer d'abord le produit sans images
    const produit = new Produit({
      store_id: store_id,
      nom_prod: req.body.nom_prod,
      descriptions: req.body.descriptions,
      prix_unitaire: req.body.prix_unitaire,
      stock_etat: req.body.stock_etat === 'true' || req.body.stock_etat === true,
      type_produit: req.body.type_produit,
      livraison: livraison,
      images: [], // ← Vide pour l'instant
      image_principale: 0
    });

    await produit.save();
    console.log('✅ Produit créé avec ID:', produit._id);

    // Maintenant qu'on a l'ID, déplacer les images
    if (req.files && req.files.length > 0) {
      console.log('📁 Déplacement de', req.files.length, 'images...');
      const imagePaths = moveImagesToProductFolder(req.files, produit._id);
      produit.images = imagePaths;
      await produit.save();
      console.log('✅ Images déplacées:', imagePaths);
    }

    // Peupler les infos de la boutique
    await produit.populate('store_id', 'name description');

    res.status(201).json({
      success: true,
      message: 'Produit ajouté avec succès',
      data: produit
    });
  } catch (error) {
    console.error('❌ Erreur création produit:', error);

    // Nettoyer les fichiers temporaires en cas d'erreur
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Récupérer tous les produits
 */
exports.getProduits = async (req, res) => {
  try {
    let query = {};

    // Si l'utilisateur est authentifié
    if (req.user) {
      // Si l'utilisateur est propriétaire de boutique
      if (req.user.role === 'Boutique' && req.boutique) {
        query.store_id = req.boutique._id;
      }
      // Si admin ou acheteur
      else {
        const boutiquesValidees = await Boutique.find({ isValidated: true }).select('_id');
        query.store_id = { $in: boutiquesValidees.map(b => b._id) };
      }
    } else {
      // Pas authentifié : montrer tous les produits des boutiques validées
      const boutiquesValidees = await Boutique.find({ isValidated: true }).select('_id');
      query.store_id = { $in: boutiquesValidees.map(b => b._id) };
    }

    const produits = await Produit.find(query)
      .populate('store_id', 'name description categoryId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: produits.length,
      data: produits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Récupérer un produit par ID
 */
exports.getProduitById = async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id)
      .populate('store_id', 'name description categoryId ownerId');

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    res.json({
      success: true,
      data: produit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Mettre à jour un produit (ajouter des images)
 */
exports.updateProduit = async (req, res) => {
  try {
    let produit = await Produit.findById(req.params.id);

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user && req.user.role === 'Boutique') {
      if (!req.boutique || produit.store_id.toString() !== req.boutique._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez modifier que vos propres produits'
        });
      }
    }

    // Ne pas permettre de changer le store_id (sauf pour admin)
    if (req.user && req.user.role !== 'Admin') {
      delete req.body.store_id;
    }

    // Parser la livraison
    if (req.body.livraison && typeof req.body.livraison === 'string') {
      req.body.livraison = JSON.parse(req.body.livraison);
    }

    // Ajouter de nouvelles images
    if (req.files && req.files.length > 0) {
      const newImagePaths = moveImagesToProductFolder(req.files, produit._id);
      req.body.images = [...produit.images, ...newImagePaths];
    }

    // Mettre à jour l'image principale
    if (req.body.image_principale !== undefined) {
      req.body.image_principale = parseInt(req.body.image_principale);
    }

    produit = await Produit.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('store_id', 'name description');

    res.json({
      success: true,
      data: produit
    });
  } catch (error) {
    console.error('Erreur mise à jour produit:', error);

    // Nettoyer les fichiers temporaires
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Supprimer une image spécifique d'un produit
 */
exports.deleteImage = async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id);

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user && req.user.role === 'Boutique') {
      if (!req.boutique || produit.store_id.toString() !== req.boutique._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez modifier que vos propres produits'
        });
      }
    }

    const imageIndex = parseInt(req.params.imageIndex);

    if (imageIndex < 0 || imageIndex >= produit.images.length) {
      return res.status(400).json({
        success: false,
        message: 'Index d\'image invalide'
      });
    }

    // Supprimer le fichier physique
    const imagePath = path.join(__dirname, '..', produit.images[imageIndex]);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Retirer du tableau
    produit.images.splice(imageIndex, 1);

    // Ajuster l'image principale
    if (produit.image_principale >= produit.images.length) {
      produit.image_principale = Math.max(0, produit.images.length - 1);
    }

    await produit.save();

    res.json({
      success: true,
      message: 'Image supprimée avec succès',
      data: produit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Supprimer un produit
 */
exports.deleteProduit = async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id);

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user && req.user.role === 'Boutique') {
      if (!req.boutique || produit.store_id.toString() !== req.boutique._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez supprimer que vos propres produits'
        });
      }
    }

    // Supprimer le dossier du produit avec toutes ses images
    const productPath = path.join(__dirname, '../uploads/produits', produit._id.toString());
    if (fs.existsSync(productPath)) {
      fs.rmSync(productPath, { recursive: true, force: true });
      console.log('🗑️  Dossier supprimé:', productPath);
    }

    await Produit.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};