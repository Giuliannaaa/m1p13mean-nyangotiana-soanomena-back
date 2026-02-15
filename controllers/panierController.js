const Panier = require('../models/Panier');
const Produit = require('../models/Produits');
const Achat = require('../models/Achat');
const Promotion = require('../models/Promotions');

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

/**
 * Récupérer la promotion active pour un produit (Copied from achatController for isolation or import if preferred)
 */
const getPromotionActive = async (prod_id) => {
    const now = new Date();
    return await Promotion.findOne({
        prod_id: prod_id,
        est_Active: true,
        debut: { $lte: now },
        fin: { $gte: now }
    });
};

/**
 * Calculer la réduction selon le type de promotion
 */
const calculerReduction = (prix_unitaire, quantite, promotion) => {
    if (!promotion) return 0;
    const montantPromo = parseFloat(promotion.montant.toString());
    const totalAvantReduc = prix_unitaire * quantite;
    if (promotion.type_prom === 'POURCENTAGE') {
        return totalAvantReduc * (montantPromo / 100);
    } else {
        return montantPromo * quantite;
    }
};

exports.validatePanier = async (req, res, next) => {
    try {
        const { avecLivraison } = req.body;
        let panier = await Panier.findOne({ client: req.user.id }).populate('items.produit');

        if (!panier || panier.items.length === 0) {
            return res.status(400).json({ success: false, error: 'Le panier est vide' });
        }

        // 0. Pre-check stock for all items
        for (const item of panier.items) {
            if (item.produit && item.produit.type_produit === 'PRODUIT') {
                if (!item.produit.stock || item.produit.stock < item.quantite) {
                    return res.status(400).json({
                        success: false,
                        error: `Stock insuffisant pour le produit: ${item.produit.nom_prod}`
                    });
                }
            }
        }

        // 1. Calculate totals for the entire order
        let totalAchat = 0;
        let totalReduction = 0;
        const achatItems = [];

        for (const item of panier.items) {
            if (!item.produit) continue;

            const prix = parseFloat(item.prixUnitaire.toString());
            totalAchat += prix * item.quantite;

            // Check for active promotion
            const promotion = await getPromotionActive(item.produit._id);
            const reductionItem = calculerReduction(prix, item.quantite, promotion);
            totalReduction += reductionItem;

            achatItems.push({
                prod_id: item.produit._id,
                nom_prod: item.produit.nom_prod,
                image_url: item.produit.image_Url || '',
                quantity: item.quantite,
                prix_unitaire: prix,
                promotion_id: promotion ? promotion._id : null,
                store_id: item.produit.store_id // Save store_id per item
            });
        }

        const frais_livraison = avecLivraison ? 3000 : 0;
        const total_reel = totalAchat - totalReduction + frais_livraison;

        // 2. Create the single Achat record
        const achat = new Achat({
            client_id: req.user._id || req.user.id,
            // Root store_id can be null or the first store's ID if single-store
            store_id: panier.items.length > 0 ? panier.items[0].produit.store_id : null,
            total_achat: totalAchat,
            reduction: totalReduction,
            frais_livraison: frais_livraison,
            avec_livraison: avecLivraison,
            total_reel: total_reel,
            items: achatItems,
            status: 'EN_ATTENTE'
        });

        await achat.save();

        // 3. Clear Cart
        panier.items = [];
        panier.total = 0;
        await panier.save();

        res.status(200).json({
            success: true,
            message: 'Commande créée avec succès',
            data: [achat] // Keep as array for frontend compatibility
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
