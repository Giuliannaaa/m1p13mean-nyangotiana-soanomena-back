const mongoose = require('mongoose');

const suiviSchema = new mongoose.Schema(
    {
        acheteur_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users',
            required: true
        },
        boutique_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Boutique',
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Index unique : un acheteur ne peut suivre une boutique qu'une fois
//suiviSchema.index({ acheteur_id: 1, boutique_id: 1 }, { unique: true });

module.exports = mongoose.model('Suivi', suiviSchema);