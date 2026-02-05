const mongoose = require('mongoose');

const boutiqueSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Categories',
            required: true
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users',
            required: true
        },
        isValidated: {
            type: Boolean,
            default: false
        },
        legal: {
            nif: {
                type: String,
                trim: true
            },
            stat: {
                type: String,
                trim: true
            },
            rent: {
                type: String,
                trim: true
            }
        }
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