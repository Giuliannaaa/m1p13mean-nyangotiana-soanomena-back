const Produit = require('../models/Produits');
const Boutique = require('../models/Boutique');
const Promotion = require('../models/Promotions');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');

/**
 * FONCTION UTILITAIRE : Récupérer et attacher les infos de promotion (isPromoted, prix_promo, etc.)
 */
const attachPromotionInfo = async (produit) => {
  try {
    const now = new Date();
    const produitId = produit._id;

    // Chercher une promotion active pour ce produit
    const activePromotion = await Promotion.findOne({
      prod_id: produitId,
      est_Active: true,
      debut: { $lte: now },
      fin: { $gte: now }
    });

    // Convertir en objet JS simple pour pouvoir ajouter des propriétés
    const produitObj = produit.toObject ? produit.toObject() : produit;

    // Helper pour extraire une valeur numérique de Decimal128 ou autre
    const getNumeric = (val) => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return val;
      if (val.$numberDecimal) return parseFloat(val.$numberDecimal);
      if (typeof val.toString === 'function') {
        const str = val.toString();
        return str === '[object Object]' ? 0 : parseFloat(str);
      }
      return parseFloat(val) || 0;
    };

    if (activePromotion) {
      produitObj.isPromoted = true;
      produitObj.promotion = activePromotion;

      const prixUnitaire = getNumeric(produitObj.prix_unitaire);
      const montantPromo = getNumeric(activePromotion.montant);

      if (activePromotion.type_prom === 'POURCENTAGE') {
        // S'assurer que le prix baisse : prix * (1 - reduction/100)
        produitObj.prix_promo = prixUnitaire * (1 - Math.abs(montantPromo) / 100);

      } else if (activePromotion.type_prom === 'MONTANT') {
        // S'assurer que le prix baisse : prix - montant
        produitObj.prix_promo = Math.max(0, prixUnitaire - Math.abs(montantPromo));
      }

      // Sécurité : prix_promo ne doit pas dépasser prix_unitaire
      if (produitObj.prix_promo > prixUnitaire) {
        produitObj.prix_promo = prixUnitaire;
      }
    } else {
      produitObj.isPromoted = false;
      produitObj.prix_promo = null;
      produitObj.promotion = null;
    }

    return produitObj;
  } catch (error) {
    console.error('Erreur attachPromotionInfo:', error);
    return produit.toObject ? produit.toObject() : produit;
  }
};

/**
 * FONCTION UTILITAIRE : Mettre à jour isPromoted basé sur les promotions actives
 * (Gardée pour compatibilité si utilisée ailleurs, mais attachPromotionInfo est plus complète)
 */
const updatePromotionStatus = async (produitId) => {
  try {
    const now = new Date();
    const activePromotion = await Promotion.findOne({
      prod_id: produitId,
      est_Active: true,
      debut: { $lte: now },
      fin: { $gte: now }
    });

    await Produit.findByIdAndUpdate(produitId, { isPromoted: !!activePromotion });
  } catch (error) {
    console.error('Erreur updatePromotionStatus:', error);
  }
};

/**
 * Créer un produit (associé à la boutique de l'utilisateur connecté)
 */
exports.createProduit = async (req, res) => {
  try {
    let store_id;

    // Si l'utilisateur est un propriétaire de boutique 
    if (req.user.role === 'Boutique') {
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
    }
    // Si c'est un admin, il peut spécifier le store_id
    else if (req.user.role === 'Admin') {
      store_id = req.body.store_id;

      if (!store_id) {
        return res.status(400).json({
          success: false,
          message: 'L\'admin doit spécifier un store_id'
        });
      }
    }

    // Parser la livraison si elle est en string (à cause de multer)
    const livraison = req.body.livraison
      ? (typeof req.body.livraison === 'string'
        ? JSON.parse(req.body.livraison)
        : req.body.livraison)
      : { disponibilite: false, frais: 0 };

    // Gérer le stock selon le type de produit
    if (req.body.type_produit === 'SERVICE') {
      req.body.stock = null; // Forcer stock à null pour les services
    } else if (req.body.type_produit === 'PRODUIT') {
      // Si stock n'est pas fourni pour un produit, utiliser l'ancien ou 0
      if (req.body.stock === undefined || req.body.stock === null || req.body.stock === '') {
        req.body.stock = produit.stock || 0;
      }
    }

    const produit = new Produit({
      store_id: store_id,
      nom_prod: req.body.nom_prod,
      descriptions: req.body.descriptions,
      prix_unitaire: req.body.prix_unitaire,
      stock_etat: req.body.stock_etat === 'true' || req.body.stock_etat === true,
      type_produit: req.body.type_produit,
      livraison: livraison,
      image_Url: '',
      // Initialiser les champs de filtrage
      isNew: true,
      isBestSeller: false,
      isPromoted: false,
      purchaseCount: 0,
      views: 0,
      stock: req.body.stock,
    });


    if (req.files.image_Url) {
      const file = req.files.image_Url;

      const uploadDir = path.join('uploads/product', produit._id.toString());
      await fs.mkdir(uploadDir, { recursive: true });

      const filename = `${file.name}`;
      const filePath = path.join(uploadDir, filename);

      await file.mv(filePath);

      produit.image_Url = filePath;
    }
    await produit.save();

    // Peupler les infos de la boutique
    await produit.populate('store_id', 'name description');

    res.status(201).json({
      success: true,
      message: 'Produit ajouté avec succès',
      data: produit
    });
  } catch (error) {
    console.error('Erreur création produit:', error);
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

    const boutiqueRattachee = await Boutique.findOne({ ownerId: new mongoose.Types.ObjectId(decodedToken.id) });
    let query = {};

    // Si l'utilisateur est propriétaire de boutique
    if (role == 'Boutique') {
      if (!boutiqueRattachee) {
        return res.json({
          success: true,
          count: 0,
          data: []
        });
      }
      query.store_id = boutiqueRattachee._id;
    }
    // Si c'est un acheteur
    else if (role === 'Acheteur') {
      const boutiquesValidees = await Boutique.find({ isValidated: true }).select('_id');

      query.store_id = { $in: boutiquesValidees.map(b => b._id.toString()) };
    }
    // Admin
    else if (role === 'Admin') {
      const boutique = await Boutique.find().select('_id');
      query.store_id = { $in: boutique.map(b => b._id) };
    }

    const produits = await Produit.find(query)
      .populate('store_id', 'name description categoryId')
      .sort({ createdAt: -1 });

    // Enrichir chaque produit avec les infos de promotion
    const enrichedProduits = [];
    for (const produit of produits) {
      enrichedProduits.push(await attachPromotionInfo(produit));
    }

    res.json({
      success: true,
      count: enrichedProduits.length,
      data: enrichedProduits
    });
  } catch (error) {
    console.error('Erreur dans getProduits:', error);
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
      .populate('store_id', 'name description categoryId ownerId stock');

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Incrémenter le nombre de vues
    produit.views = (produit.views || 0) + 1;
    await produit.save();

    // Enrichir avec les infos de promotion
    const enrichedProduit = await attachPromotionInfo(produit);

    res.json({
      success: true,
      data: enrichedProduit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Mettre à jour un produit
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
    if (req.user.role === 'Boutique') {
      if (!req.boutique || produit.store_id.toString() !== req.boutique._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez modifier que vos propres produits'
        });
      }
    }

    // Ne pas permettre de changer le store_id (sauf pour admin)
    if (req.user.role !== 'Admin') {
      delete req.body.store_id;
    }

    // Parser la livraison si elle est en string (à cause de multer)
    if (req.body.livraison && typeof req.body.livraison === 'string') {
      req.body.livraison = JSON.parse(req.body.livraison);
    }

    // Gérer le stock selon le type de produit
    if (req.body.type_produit === 'SERVICE') {
      req.body.stock = null; // Forcer stock à null pour les services
    } else if (req.body.type_produit === 'PRODUIT') {
      // Si stock n'est pas fourni pour un produit, utiliser l'ancien ou 0
      if (req.body.stock === undefined || req.body.stock === null || req.body.stock === '') {
        req.body.stock = produit.stock || 0;
      }
    }

    // Si un nouveau fichier est uploadé
    if (req.files && req.files.image_Url) {
      const file = req.files.image_Url;

      const uploadDir = path.join('uploads/product', req.params.id);
      await fs.mkdir(uploadDir, { recursive: true });

      const filename = `${file.name}`;
      const filePath = path.join(uploadDir, filename);

      // Optionnel : Supprimer l'ancienne image si elle existe
      if (produit.image_Url && produit.image_Url !== filePath) {
        try {
          await fs.unlink(produit.image_Url);
        } catch (err) {
          console.error('Erreur suppression ancienne image:', err);
        }
      }

      await file.mv(filePath);

      req.body.image_Url = filePath;
    }

    produit = await Produit.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('store_id', 'name descriptions');

    res.json({
      success: true,
      data: produit
    });
  } catch (error) {
    res.status(400).json({
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
    if (req.user.role === 'Boutique') {
      if (!req.boutique || produit.store_id.toString() !== req.boutique._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez supprimer que vos propres produits'
        });
      }
    }

    await Produit.findByIdAndDelete(req.params.id);

    // Supprimer le dossier des images du produit
    const uploadDir = path.join('uploads/product', req.params.id);
    try {
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Erreur suppression dossier produit:', err);
    }

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

/**
 * Obtenir les produits "Nouveau" (créés il y a moins de 30 jours)
 */
exports.getNewProduits = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Chercher les produits créés APRÈS thirtyDaysAgo
    const produits = await Produit.find({
      createdAt: { $gte: thirtyDaysAgo }  // créé après 30 jours
    })
      .populate('store_id', 'name description')
      .sort({ createdAt: -1 });

    // Enrichir chaque produit
    const enrichedProduits = [];
    for (const produit of produits) {
      enrichedProduits.push(await attachPromotionInfo(produit));
    }

    res.json({
      success: true,
      count: enrichedProduits.length,
      data: enrichedProduits
    });
  } catch (error) {
    console.error('Erreur getNewProduits:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir les produits "Populaire" (qu'ils soient en promotion ou non)
 */
exports.getPopularProduits = async (req, res) => {
  try {
    const produits = await Produit.find({
      $or: [
        { purchaseCount: { $gt: 0 } },
        { views: { $gt: 50 } }
      ]
    })
      .populate('store_id', 'name description')
      .sort({ purchaseCount: -1, views: -1 });

    // Enrichir chaque produit
    const enrichedProduits = [];
    for (const produit of produits) {
      enrichedProduits.push(await attachPromotionInfo(produit));
    }

    res.json({
      success: true,
      count: enrichedProduits.length,
      data: enrichedProduits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir les produits "Best-seller" (qu'ils soient en promotion ou non)
 */
exports.getBestSellerProduits = async (req, res) => {
  try {
    const produits = await Produit.find({ isBestSeller: true })
      .populate('store_id', 'name description')
      .sort({ purchaseCount: -1 });

    // Enrichir chaque produit
    const enrichedProduits = [];
    for (const produit of produits) {
      enrichedProduits.push(await attachPromotionInfo(produit));
    }

    res.json({
      success: true,
      count: enrichedProduits.length,
      data: enrichedProduits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir les produits en "Promotion" (avec vérification des dates)
 */
exports.getPromotedProduits = async (req, res) => {
  try {
    const now = new Date();

    // Chercher les promotions actives et valides (entre debut et fin)
    const activePromotions = await Promotion.find({
      est_Active: true,
      debut: { $lte: now },
      fin: { $gte: now }
    }).select('prod_id');

    const productIds = activePromotions.map(p => p.prod_id);

    // Récupérer les produits avec ces IDs
    const produits = await Produit.find({ _id: { $in: productIds } })
      .populate('store_id', 'name description')
      .sort({ createdAt: -1 });

    // Enrichir chaque produit
    const enrichedProduits = [];
    for (const produit of produits) {
      enrichedProduits.push(await attachPromotionInfo(produit));
    }

    res.json({
      success: true,
      count: enrichedProduits.length,
      data: enrichedProduits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Incrémenter le nombre d'achats d'un produit
 */
exports.incrementPurchaseCount = async (produitId) => {
  try {
    const produit = await Produit.findById(produitId);
    if (produit) {
      produit.purchaseCount = (produit.purchaseCount || 0) + 1;

      // Si plus de 10 achats, marquer comme best-seller
      if (produit.purchaseCount > 10) {
        produit.isBestSeller = true;
      }

      await produit.save();
    }
  } catch (error) {
    console.error('Erreur incrementPurchaseCount:', error);
  }
};

/**
 * Obtenir les produits d'une boutique spécifique
 */
exports.getProduitOfStore = async (req, res) => {
  try {
    const store_id = req.params.store_id;
    const produits = await Produit.find({ store_id: store_id })
      .populate('store_id', 'name description')
      .sort({ createdAt: -1 });

    // Enrichir chaque produit
    const enrichedProduits = [];
    for (const produit of produits) {
      enrichedProduits.push(await attachPromotionInfo(produit));
    }

    res.json({
      success: true,
      count: enrichedProduits.length,
      data: enrichedProduits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateProductPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { prix_unitaire } = req.body;

    if (prix_unitaire === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Le prix unitaire est requis'
      });
    }

    const produit = await Produit.findById(id);

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role === 'Boutique') {
      if (!req.boutique || produit.store_id.toString() !== req.boutique._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez modifier que le prix de vos propres produits'
        });
      }
    }

    produit.prix_unitaire = prix_unitaire;
    await produit.save();

    res.status(200).json({
      success: true,
      message: 'Prix mis à jour avec succès',
      data: produit
    });
  } catch (error) {
    console.error('Erreur updateProductPrice:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
