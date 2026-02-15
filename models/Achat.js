const mongoose = require('mongoose');

// Tableau de produit
const AchatProdSchema = new mongoose.Schema({
  prod_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  nom_prod: { type: String, required: true },
  image_url: { type: String, default: '' },
  quantity: { type: Number, required: true },
  prix_unitaire: { type: mongoose.Schema.Types.Decimal128, required: true },
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique' }
});

const AchatSchema = new mongoose.Schema({
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: false },
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: false },
  status: {
    type: String,
    enum: ['EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON', 'DELIVREE', 'ANNULEE'],
    default: 'EN_ATTENTE'
  },
  total_achat: { type: mongoose.Schema.Types.Decimal128, required: true },
  reduction: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  frais_livraison: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  avec_livraison: { type: Boolean, default: false },
  total_reel: { type: mongoose.Schema.Types.Decimal128, required: true },
  items: [AchatProdSchema]
}, { timestamps: true });

module.exports = mongoose.model('Achats', AchatSchema);