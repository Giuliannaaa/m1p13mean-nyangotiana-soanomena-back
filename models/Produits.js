const mongoose = require('mongoose');

// Sous-schema pour la livraison
const livraisonSchema = new mongoose.Schema({
  disponibilite: { type: Boolean, default: false },
  frais: { type: mongoose.Schema.Types.Decimal128, default: 0 }
}, { _id: false });

// Schema principal produit
const ProduitSchema = new mongoose.Schema({
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutiques', required: false },
  nom_prod: { type: String, required: true, trim: true },
  descriptions: { type: String, trim: true },
  prix_unitaire: { type: mongoose.Schema.Types.Decimal128, required: true },
  stock_etat: { type: Boolean, default: true },
  type_produit: { type: String, enum: ['PRODUIT', 'SERVICE'], required: true },
  livraison: livraisonSchema,
  image_Url: { type: String, default: '' }
}, { timestamps: true });

// Avant save, si c'est un service, livraison = false + frais = 0
ProduitSchema.pre('save', function (next) {
  if (this.type_produit === 'SERVICE') {
    this.livraison.disponibilite = false;
    this.livraison.frais = 0;
  }
  next();
});

module.exports = mongoose.model('Produit', ProduitSchema);
