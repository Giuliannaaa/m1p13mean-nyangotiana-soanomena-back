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

module.exports = mongoose.model('Boutique', boutiqueSchema);