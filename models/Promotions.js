const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema(
  {
    prod_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Produits',
      required: true
    },

    type_prom: {
      type: String,
      enum: ['POURCENTAGE', 'MONTANT'],
      required: true
    },

    montant: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },

    code_promo: {
        type: String,
        require: null
    },

    debut: {
      type: Date,
      required: true
    },

    fin: {
      type: Date,
      required: true
    },

    est_Active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

/** CONTRAINTE DATE SI LA DATE D'ENTREE EST APRES LA FIN, C'EST INVALIDE */

PromotionSchema.pre('save', function (next) {
  if (this.fin <= this.debut) {
    return next(new Error('La date de fin doit être après la date de début'));
  }
  next();
});

/** CONTRAINTE MONTANT : LE MONTANT NE PEUT PAS ETRE INFERIEUR A 0 */

PromotionSchema.pre('save', function (next) {
  const value = parseFloat(this.montant.toString());

  if (this.type_prom === 'POURCENTAGE' && (value <= 0 || value > 100)) {
    return next(new Error('Pourcentage invalide'));
  }

  if (this.type_prom === 'MONTANT' && value <= 0) {
    return next(new Error('Montant invalide'));
  }

  next();
});

/** A UTILISER A L'ACHAT : VERIFIER SI UNE PROMOTION EST ACTIVE*/

/*const now = new Date();

const promo = await Promotion.findOne({
  prod_id: productId,
  est_Active: true,
  debut: { $lte: now },
  fin: { $gte: now }
});*/

 

module.exports = mongoose.model('Promotions', PromotionSchema);
