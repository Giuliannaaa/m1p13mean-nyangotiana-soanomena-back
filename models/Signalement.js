const mongoose = require('mongoose');

const signalementSchema = new mongoose.Schema(
    {
        acheteur_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
        produit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
        boutique_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
        raison: {
            type: String,
            enum: [
                'produit_defectueux',
                'description_inexacte',
                'prix_incorrect',
                'contenu_offensant',
                'produit_non_conforme',
                'arnaque',
                'autre'
            ],
            required: true
        },
        description: { type: String, required: true, maxlength: 1000 },
        statut: {
            type: String,
            enum: ['signale', 
                'en_cours', 
                'resolu', 
                'rejete'],
            default: 'signale'
        },
        reponse_admin: { type: String, maxlength: 1000 }
    },
    {
        timestamps: true
    }
);

// Index unique : un acheteur ne peut signaler un produit qu'une fois
signalementSchema.index({ acheteur_id: 1, produit_id: 1 }, { unique: true });

module.exports = mongoose.model('Signalement', signalementSchema);