const mongoose = require('mongoose');

// Tableau de produit
const AchatProdSchema = new mongoose.Schema({
  prod_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  quantity: { type: Number, required: true },
  prix_unitaire: { type: mongoose.Schema.Types.Decimal128, required: true }
});

const AchatSchema = new mongoose.Schema({
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: false }, // Utilisateurs
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: false }, // Boutiques
  status: { 
    type: String, 
    enum: ['EN ATTENTE', 'CONFIRMEE', 'DELIVREE', 'ANNULEE'], 
    default: 'EN ATTENTE' 
  },
  total_achat: { type: mongoose.Schema.Types.Decimal128, required: true },
  reduction: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  frais_livraison: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  avec_livraison: { type: Boolean, default: false },
  total_reel: { type: mongoose.Schema.Types.Decimal128, required: true },
  items: [AchatProdSchema]
}, { timestamps: true });

module.exports = mongoose.model('Achats', AchatSchema);
