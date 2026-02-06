const mongoose = require('mongoose');

const PanierSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    items: [
        {
            produit: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Produit',
                required: true
            },
            nomProduit: { // Snapshot for easier display
                type: String
            },
            quantite: {
                type: Number,
                required: true,
                min: 1,
                default: 1
            },
            prixUnitaire: { // Snapshot of price at time of adding
                type: Number,
                required: true
            }
        }
    ],
    // Optional: Total can be calculated on the fly, but storing it is often convenient for quick access
    total: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Calculate total before saving
PanierSchema.pre('save', function (next) {
    if (this.items && this.items.length > 0) {
        this.total = this.items.reduce((acc, item) => {
            return acc + (item.prixUnitaire * item.quantite);
        }, 0);
    } else {
        this.total = 0;
    }
    next();
});

module.exports = mongoose.model('Panier', PanierSchema);
