const mongoose = require('mongoose');
const Promotion = require('../models/Promotions');

/**
 * Ajouter une promotion
 */
exports.createPromotion = async (req, res) => {
  try {
    const promotion = new Promotion({
      prod_id: req.body.prod_id,
      type_prom: req.body.type_prom,
      montant: req.body.montant, // Mongoose convertira automatiquement (Tsy nety le convertir montant en Decimal128)
      code_promo: req.body.code_promo || null,
      debut: new Date(req.body.debut),
      fin: new Date(req.body.fin),
      est_Active: req.body.est_Active ?? true
    });

    await promotion.save();
    res.status(201).json(promotion);
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
      { new: true, runValidators: true } // ← Ajoute runValidators pour valider les contraintes
    );

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    res.json(promotion);
  } catch (error) {
    console.error('Erreur update promotion:', error); // ← Pour déboguer
    res.status(400).json({ message: error.message });
  }
};

/**
 *  Supprimer une promotion
 */
exports.deletePromotion = async (req, res) => {
  try {
    await Promotion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Promotion supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 *  Activer / désactiver une promotion
 */
exports.togglePromotionStatus = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    promotion.est_Active = !promotion.est_Active;
    await promotion.save();

    res.json(promotion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }

  /** C'EST POUR AFFICHER LE NOM DE LA PROMOTION DANS LE FRONT, UTILISER POPULATE 
   * Sans populate, prod_id = juste un ID, avec populate, tu as prod_id.nom_prod
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

};
