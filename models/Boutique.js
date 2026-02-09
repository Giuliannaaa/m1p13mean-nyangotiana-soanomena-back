const mongoose = require('mongoose');

const boutiqueSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Categories', required: true },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
        isValidated: { type: Boolean, default: false },
        legal: {
            nif: { type: String, trim: true },
            stat: { type: String, trim: true },
            rent: { type: String, trim: true }
        },

        images: [
            {
                url: { type: String, required: true },
                altText: String,
                isCover: { type: Boolean, default: false },
                position: Number,
                uploadedAt: { type: Date, default: Date.now }
            }
        ],

        // ✅ Ajouter ces champs pour les filtres spéciaux
        isNew: { type: Boolean, default: true }, // Nouvelle boutique (créée il y a moins de 30 jours)
        isPopular: { type: Boolean, default: false }, // Boutique populaire
        isFeatured: { type: Boolean, default: false }, // Boutique mise en avant
        productCount: { type: Number, default: 0 }, // Nombre de produits
        rating: { type: Number, default: 0, min: 0, max: 5 }, // Note moyenne (0-5)
        followers: { type: Number, default: 0 } // Nombre de followers/clients
    },
    {
        timestamps: true
    }
);

// Prendre le nombre de boutique actives, si le propriétaire est aussi actif
boutiqueSchema.statics.countActiveStores = async function () {
    const result = await this.aggregate([
        {
            $match: { isValidated: true }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'ownerId',
                foreignField: '_id',
                as: 'owner'
            }
        },
        {
            $unwind: '$owner'
        },
        {
            $match: { 'owner.isActive': true }
        },
        {
            $count: 'total'
        }
    ]);

    return result.length > 0 ? result[0].total : 0;
};

// Prendre le nombre de boutique inactives, si le propriétaire est aussi inactif
boutiqueSchema.statics.countInactiveStores = async function () {
    const result = await this.aggregate([
        {
            $match: { isValidated: false }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'ownerId',
                foreignField: '_id',
                as: 'owner'
            }
        },
        {
            $unwind: '$owner'
        },
        {
            $match: { 'owner.isActive': false }
        },
        {
            $count: 'total'
        }
    ]);

    return result.length > 0 ? result[0].total : 0;
};

// Prendre le nombre total des boutiques présents même si le propriétaire est inactif
boutiqueSchema.statics.countTotalStores = async function () {
    const result = await this.aggregate([
        {
            $count: 'total'
        }
    ]);

    return result.length > 0 ? result[0].total : 0;
};

module.exports = mongoose.model('Boutique', boutiqueSchema);