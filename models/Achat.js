const mongoose = require('mongoose');

const prodSchema = new mongoose.Schema(
  {

    // PRODUIT
    prod_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Produit',
      required: true
    },

    quantite: {
      type: Number,
      required: true,
      min: 1
    },

    prix_unit: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    }
  },
  { _id: false }
);

const AchatSchema = new mongoose.Schema(
  {
    // CLIENT
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: false
    },

    // BOUTIQUE
    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boutiques',
      required: false
    },

    // PRODUITS
    prods: {
      type: [prodSchema],
      required: true
    },

    // MONTANTS PRIX UNITAIRE X QUANTITE
    total: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },

    reduction: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0
    },

    // MONTANT AVEC PROMOTION (REDUCTION)

    prix_reel: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },

    // PROMOTION UTILISÉE
    id_prom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promotions',
      default: null
    },

    achat_date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Achats', AchatSchema);
