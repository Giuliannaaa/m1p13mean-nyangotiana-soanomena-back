const mongoose = require('mongoose');
const Produit = require('../models/Produits');
const Boutique = require('../models/Boutique');
const Promotion = require('../models/Promotions'); // ✅ Importer Promotion
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * FONCTION UTILITAIRE : Mettre à jour isPromoted basé sur les promotions actives
 */
const updatePromotionStatus = async (produitId) => {
  try {
    const now = new Date();
    
    // Chercher une promotion active pour ce produit
    const activePromotion = await Promotion.findOne({
      prod_id: produitId,
      est_Active: true,
      debut: { $lte: now },
      fin: { $gte: now }
    });
    
    // Mettre à jour isPromoted basé sur la présence d'une promotion active
    await Produit.findByIdAndUpdate(
      produitId,
      { isPromoted: !!activePromotion }, // true si promotion active, false sinon
      //{ new: true }
    );
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

    const produit = new Produit({
      store_id: store_id,
      nom_prod: req.body.nom_prod,
      descriptions: req.body.descriptions,
      prix_unitaire: req.body.prix_unitaire,
      stock_etat: req.body.stock_etat === 'true' || req.body.stock_etat === true,
      type_produit: req.body.type_produit,
      livraison: livraison,
      image_Url: req.file ? req.file.path : '',
      // Initialiser les champs de filtrage
      isNew: true,
      isBestSeller: false,
      isPromoted: false,
      purchaseCount: 0,
      views: 0
    });

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
    console.log('User role:', role);

    const boutiqueRattachee = await Boutique.findOne({ ownerId: decodedToken.id });
    console.log('Boutique attached:', boutiqueRattachee);

    let query = {};

    // Si l'utilisateur est propriétaire de boutique
    if (role === 'Boutique' && boutiqueRattachee) {
      query.store_id = boutiqueRattachee._id;
    }
    // Si c'est un acheteur
    else if (role === 'Acheteur') {
      const boutiquesValidees = await Boutique.find({ isValidated: true }).select('_id');
      console.log('Boutiques validées trouvées:', boutiquesValidees.length);
      console.log('IDs des boutiques validées:', boutiquesValidees.map(b => b._id));

      query.store_id = { $in: boutiquesValidees.map(b => b._id.toString()) };
    }
    // Admin
    else {
      const boutique = await Boutique.find().select('_id');
      query.store_id = { $in: boutique.map(b => b._id) };
    }

    console.log('Query utilisée:', JSON.stringify(query));

    const produits = await Produit.find(query)
      .populate('store_id', 'name description categoryId')
      .sort({ createdAt: -1 });

    console.log('Produits trouvés:', produits.length);

    // Mettre à jour isPromoted pour chaque produit basé sur les promotions actives
    for (const produit of produits) {
      await updatePromotionStatus(produit._id);
    }

    // Récupérer les produits à nouveau avec les flags à jour
    const produitsUpdated = await Produit.find(query)
      .populate('store_id', 'name description categoryId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: produitsUpdated.length,
      data: produitsUpdated
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
      .populate('store_id', 'name description categoryId ownerId');

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    
    // Incrémenter le nombre de vues
    produit.views = (produit.views || 0) + 1;
    await produit.save();

    // Mettre à jour isPromoted basé sur les promotions actives
    await updatePromotionStatus(req.params.id);

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

    // Si un nouveau fichier est uploadé
    if (req.file) {
      req.body.image_Url = req.file.path;
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

    console.log('Produits nouveaux trouvés:', produits.length);

    res.json({
      success: true,
      count: produits.length,
      data: produits
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
 * Obtenir les produits "Best-seller" (qu'ils soient en promotion ou non)
 */
exports.getBestSellerProduits = async (req, res) => {
  try {
    const produits = await Produit.find({ isBestSeller: true })
      .populate('store_id', 'name description')
      .sort({ purchaseCount: -1 });

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

    // ✅ Marquer isPromoted = true pour ces produits
    await Produit.updateMany(
      { _id: { $in: productIds } },
      { isPromoted: true }
    );

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