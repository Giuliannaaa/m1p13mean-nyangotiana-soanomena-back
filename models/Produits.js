const mongoose = require('mongoose');

// Sous-schema pour la livraison
const livraisonSchema = new mongoose.Schema({
  disponibilite: { type: Boolean, default: false },
  frais: { type: mongoose.Schema.Types.Decimal128, default: 0 }
}, { _id: false });

// Schema principal produit
const ProduitSchema = new mongoose.Schema({
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  nom_prod: { type: String, required: true, trim: true },
  descriptions: { type: String, trim: true },
  prix_unitaire: { type: mongoose.Schema.Types.Decimal128, required: true },
  stock_etat: { type: Boolean, default: true },
  type_produit: { type: String, enum: ['PRODUIT', 'SERVICE'], required: true },
  livraison: livraisonSchema,
  image_Url: { type: String, default: '' },
  
  // Ajouter ces champs pour les filtres spéciaux
  isNew: { type: Boolean, default: true }, // Nouveau produit (créé il y a moins de 30 jours)
  isBestSeller: { type: Boolean, default: false }, // Produit très vendu
  isPromoted: { type: Boolean, default: false }, // Produit en promotion spéciale
  purchaseCount: { type: Number, default: 0 }, // Nombre d'achats
  views: { type: Number, default: 0 } // Nombre de vues
}, { timestamps: true });

// Avant save, si c'est un service, livraison = false + frais = 0
ProduitSchema.pre('save', function (next) {
  if (this.type_produit === 'SERVICE') {
    this.livraison.disponibilite = false;
    this.livraison.frais = 0;
  }
  
  // Marquer un produit comme "nouveau" seulement s'il a moins de 30 jours
  if (this.isNew) {
    const createdDate = this.createdAt || new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Si le produit a plus de 30 jours, il n'est plus "nouveau"
    if (createdDate < thirtyDaysAgo) {
      this.isNew = false;
    }
  }
  
  next();
});

module.exports = mongoose.model('Produit', ProduitSchema);