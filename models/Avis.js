const mongoose = require('mongoose');

const avisSchema = new mongoose.Schema(
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
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 500
        }
    },
    {
        timestamps: true
    }
);

// Index unique : un acheteur ne peut noter une boutique qu'une fois
avisSchema.index({ acheteur_id: 1, boutique_id: 1 }, { unique: true });

module.exports = mongoose.model('Avis', avisSchema);