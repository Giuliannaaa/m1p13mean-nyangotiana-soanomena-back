const Panier = require('../models/Panier');
const Produit = require('../models/Produits');
const Achat = require('../models/Achat');

// @desc    Get current user's cart
// @route   GET /api/panier
// @access  Private (Acheteur only)
exports.getPanier = async (req, res, next) => {
    try {
        let panier = await Panier.findOne({ client: req.user.id }).populate('items.produit');

        if (!panier) {
            // Optionnel: Créer un panier vide si aucun n'existe lors de la récupération
            // Ou retourner un objet vide/null
            return res.status(200).json({ success: true, data: { items: [], total: 0 } });
        }

        res.status(200).json({
            success: true,
            data: panier
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Add item to cart
// @route   POST /api/panier/add
// @access  Private (Acheteur only)
exports.addToPanier = async (req, res, next) => {
    // productId, quantity
    const { productId, quantity } = req.body;

    // Validate quantity
    const parsedQty = parseInt(quantity, 10);
    if (!parsedQty || parsedQty < 1) {
        return res.status(400).json({ success: false, error: 'La quantité doit être au moins 1' });
    }

    try {
        const produit = await Produit.findById(productId);
        if (!produit) {
            return res.status(404).json({ success: false, error: 'Produit non trouvé' });
        }

        // Check if user has a cart
        let panier = await Panier.findOne({ client: req.user.id });

        if (!panier) {
            // Create new cart
            panier = new Panier({
                client: req.user.id,
                items: []
            });
        }

        // Check if product exists in cart
        const itemIndex = panier.items.findIndex(item => item.produit.toString() === productId);

        if (itemIndex > -1) {
            // Product exists, update quantity
            panier.items[itemIndex].quantite += parsedQty;
            // Update snapshot price optionally or keep original? Usually update to current price on add
            // panier.items[itemIndex].prixUnitaire = produit.prix_unitaire; 
        } else {
            // Add new item
            panier.items.push({
                produit: productId,
                quantite: parsedQty,
                prixUnitaire: produit.prix_unitaire,
                nomProduit: produit.nom_prod // Snapshot name
            });
        }

        await panier.save();

        // Re-populate to return full object
        panier = await Panier.findById(panier._id).populate('items.produit');

        res.status(200).json({
            success: true,
            data: panier
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Update item quantity (Set, not increment)
// @route   PUT /api/panier/update
// @access  Private (Acheteur only)
exports.updateItemQuantity = async (req, res, next) => {
    const { productId, quantity } = req.body;
    const parsedQty = parseInt(quantity, 10);

    if (!parsedQty || parsedQty < 1) {
        return res.status(400).json({ success: false, error: 'La quantité doit être au moins 1' });
    }

    try {
        let panier = await Panier.findOne({ client: req.user.id });

        if (!panier) {
            return res.status(404).json({ success: false, error: 'Panier non trouvé' });
        }

        const itemIndex = panier.items.findIndex(item => item.produit.toString() === productId);

        if (itemIndex > -1) {
            panier.items[itemIndex].quantite = parsedQty;
            await panier.save();
            panier = await Panier.findById(panier._id).populate('items.produit');

            return res.status(200).json({ success: true, data: panier });
        } else {
            return res.status(404).json({ success: false, error: 'Produit non trouvé dans le panier' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/panier/remove/:productId
// @access  Private (Acheteur only)
exports.removeFromPanier = async (req, res, next) => {
    const { productId } = req.params;

    try {
        let panier = await Panier.findOne({ client: req.user.id });

        if (!panier) {
            return res.status(404).json({ success: false, error: 'Panier non trouvé' });
        }

        // Filter out the item
        const initialLength = panier.items.length;
        panier.items = panier.items.filter(item => item.produit.toString() !== productId);

        if (panier.items.length === initialLength) {
            return res.status(404).json({ success: false, error: 'Produit non trouvé dans le panier' });
        }

        await panier.save();
        panier = await Panier.findById(panier._id).populate('items.produit');

        res.status(200).json({
            success: true,
            data: panier
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Validate cart and create orders (Achats)
// @route   POST /api/panier/validate
// @access  Private (Acheteur only)
exports.validatePanier = async (req, res, next) => {
    try {
        const { avecLivraison } = req.body;
        let panier = await Panier.findOne({ client: req.user.id }).populate('items.produit');

        if (!panier || panier.items.length === 0) {
            return res.status(400).json({ success: false, error: 'Le panier est vide' });
        }

        // 1. Group items by Store (Boutique)
        const itemsByStore = {};

        panier.items.forEach(item => {
            if (!item.produit) return; // Skip if product deleted

            const storeId = item.produit.store_id.toString();
            if (!itemsByStore[storeId]) {
                itemsByStore[storeId] = [];
            }
            itemsByStore[storeId].push(item);
        });

        const createdAchats = [];

        // 2. Create one Achat per Store
        for (const storeId of Object.keys(itemsByStore)) {
            const storeItems = itemsByStore[storeId];

            // Calculate totals for this store's order
            let totalAchat = 0;
            const achatItems = storeItems.map(item => {
                const prix = parseFloat(item.prixUnitaire.toString());
                totalAchat += prix * item.quantite;

                return {
                    prod_id: item.produit._id,
                    nom_prod: item.produit.nom_prod, // Assuming these fields exist based on Achat model requirements
                    image_url: item.produit.image_Url || '',
                    quantity: item.quantite,
                    prix_unitaire: prix
                };
            });

            // Basic logic: No promo, no shipping fees in this simple version unless passed?
            // User requested "Passer au panier et c'est apres validation qu'on passe à l'achat".
            // We assume standard checkout.

            const reduction = 0;
            const frais_livraison = avecLivraison ? 3000 : 0;
            const total_reel = totalAchat - reduction + frais_livraison;

            const achat = new Achat({
                client_id: req.user.id,
                store_id: storeId,
                total_achat: totalAchat,
                reduction: reduction,
                frais_livraison: frais_livraison,
                avec_livraison: avecLivraison,
                total_reel: total_reel,
                items: achatItems,
                status: 'EN ATTENTE'
            });

            await achat.save();
            createdAchats.push(achat);
        }

        // 3. Clear Cart
        panier.items = [];
        panier.total = 0;
        await panier.save();

        res.status(200).json({
            success: true,
            message: 'Commandes créées avec succès',
            data: createdAchats
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Erreur lors de la validation du panier' });
    }
};

// @desc    Clear entire cart
// @route   DELETE /api/panier/clear
// @access  Private (Acheteur only)
exports.clearPanier = async (req, res, next) => {
    try {
        let panier = await Panier.findOne({ client: req.user.id });

        if (panier) {
            panier.items = [];
            panier.total = 0; // Explicitly reset if needed, though pre-save handles it
            await panier.save();
        }

        res.status(200).json({
            success: true,
            data: { items: [], total: 0 }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
