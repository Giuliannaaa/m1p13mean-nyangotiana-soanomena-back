const mongoose = require('mongoose');
const Promotion = require('../models/Promotions');
const Produit = require('../models/Produits');

/**
 * Ajouter une promotion
 */
exports.createPromotion = async (req, res) => {
  try {
    const promotion = new Promotion({
      prod_id: req.body.prod_id,
      type_prom: req.body.type_prom,
      montant: req.body.montant,
      code_promo: req.body.code_promo || null,
      debut: new Date(req.body.debut),
      fin: new Date(req.body.fin),
      est_Active: req.body.est_Active ?? true
    });

    await promotion.save();

    // Mettre à jour le produit pour marquer isPromoted = true
    if (req.body.prod_id) {
      await Produit.findByIdAndUpdate(
        req.body.prod_id,
        { isPromoted: true },
        { new: true }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Promotion créée avec succès',
      data: promotion
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lire toutes les promotions
 */
exports.getPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.find()
      .populate('prod_id');

    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lire une promotion par ID
 */
exports.getPromotionById = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id)
      .populate('prod_id');

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    res.json(promotion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Modifier une promotion
 */
exports.updatePromotion = async (req, res) => {
  try {
    // Convertir le montant si présent
    if (req.body.montant !== undefined) {
      req.body.montant = mongoose.Types.Decimal128.fromString(String(req.body.montant));
    }

    // Convertir les dates si présentes
    if (req.body.debut) {
      req.body.debut = new Date(req.body.debut);
    }
    if (req.body.fin) {
      req.body.fin = new Date(req.body.fin);
    }

    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    res.json(promotion);
  } catch (error) {
    console.error('Erreur update promotion:', error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Supprimer une promotion
 */
exports.deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    // Avant de supprimer, vérifier s'il y a d'autres promotions actives pour ce produit
    const otherPromotions = await Promotion.countDocuments({
      prod_id: promotion.prod_id,
      _id: { $ne: req.params.id },
      est_Active: true
    });

    // Si c'est la dernière promotion active, marquer isPromoted = false
    if (otherPromotions === 0) {
      await Produit.findByIdAndUpdate(
        promotion.prod_id,
        { isPromoted: false },
        { new: true }
      );
      console.log('Produit marqué comme non en promotion');
    }

    await Promotion.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Promotion supprimée'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Obtenir les produits en promotion
 */
exports.getPromotedProduits = async (req, res) => {
  try {
    const produits = await Produit.find({ isPromoted: true })
      .populate('store_id', 'name description')
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
 * Activer / désactiver une promotion
 */
exports.togglePromotionStatus = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    promotion.est_Active = !promotion.est_Active;
    await promotion.save();

    // Mettre à jour le produit en fonction du statut
    if (promotion.est_Active) {
      await Produit.findByIdAndUpdate(
        promotion.prod_id,
        { isPromoted: true },
        { new: true }
      );
    } else {
      // Vérifier s'il y a d'autres promotions actives
      const otherActivePromotions = await Promotion.countDocuments({
        prod_id: promotion.prod_id,
        _id: { $ne: req.params.id },
        est_Active: true
      });

      if (otherActivePromotions === 0) {
        await Produit.findByIdAndUpdate(
          promotion.prod_id,
          { isPromoted: false },
          { new: true }
        );
      }
    }

    res.json({
      success: true,
      data: promotion
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Afficher toutes les promotions avec les noms des produits
 */
exports.getAllPromotions = async (req, res) => {
  try {
    const promotions = await Promotion
      .find()
      .populate('prod_id', 'nom_prod prix_unitaire');

    res.json(promotions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Récupérer la promotion active pour un produit
 */
exports.getPromotionActiveByProduit = async (req, res) => {
  try {
    const { prod_id } = req.params;
    const now = new Date();

    const promotion = await Promotion.findOne({
      prod_id: prod_id,
      est_Active: true,
      debut: { $lte: now },
      fin: { $gte: now }
    });

    if (!promotion) {
      return res.status(404).json({ message: 'Aucune promotion active' });
    }

    res.json(promotion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};