const Boutique = require('../models/Boutique');
const Achat = require('../models/Achat');
const Promotion = require('../models/Promotions');
const Produit = require('../models/Produits');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// 3. Chiffre d'affaire d'une boutique (Vue User Role Boutique: Annuel-Mensuel)
exports.getBoutiqueRevenueOwner = async (req, res) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Vérifier si le token existe
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token non fourni'
            });
        }

        const decodedToken = jwt.verify(token, config.jwtSecret);
        const role = decodedToken.role;
        const userId = decodedToken.id;

        if (role !== 'Boutique') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé: Vous devez être Boutique'
            });
        }

        const boutique = await Boutique.find({ ownerId: userId });
        const boutiqueIds = boutique.map(b => b._id);

        // Build date filter from optional query params
        const { year, month } = req.query;
        const dateMatch = {};
        if (year && month) {
            const y = parseInt(year);
            const m = parseInt(month);
            dateMatch.createdAt = {
                $gte: new Date(y, m - 1, 1),
                $lt: new Date(y, m, 1)
            };
        } else if (year) {
            const y = parseInt(year);
            dateMatch.createdAt = {
                $gte: new Date(y, 0, 1),
                $lt: new Date(y + 1, 0, 1)
            };
        }

        // Find boutiques owned by this user
        const revenue = await Achat.aggregate([
            {
                $match: {
                    status: { $in: ['CONFIRMEE', 'EN_LIVRAISON', 'DELIVREE'] },
                    ...dateMatch
                }
            },
            {
                $unwind: "$items"
            },
            {
                $match: {
                    "items.store_id": { $in: boutiqueIds }
                }
            },
            {
                $lookup: {
                    from: "boutiques",
                    localField: "items.store_id",
                    foreignField: "_id",
                    as: "boutiqueInfo"
                }
            },
            {
                $unwind: "$boutiqueInfo"
            },
            {
                $group: {
                    _id: {
                        boutiqueId: "$boutiqueInfo._id",
                        boutiqueName: "$boutiqueInfo.name",
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    totalRevenue: {
                        $sum: { $multiply: ["$items.quantity", { $toDouble: "$items.prix_unitaire" }] }
                    }
                }
            },
            {
                $sort: {
                    "_id.boutiqueId": 1,
                    "_id.year": 1,
                    "_id.month": 1
                }
            },
            {
                $project: {
                    _id: 0,
                    boutiqueName: "$_id.boutiqueName",
                    year: "$_id.year",
                    month: "$_id.month",
                    revenue: { $round: ["$totalRevenue", 2] }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: revenue
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getNumberOfProductInStoreOfOwner = async (req, res) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Vérifier si le token existe
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token non fourni'
            });
        }

        const decodedToken = jwt.verify(token, config.jwtSecret);
        const role = decodedToken.role;
        const userId = decodedToken.id;

        if (role !== 'Boutique') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé: Vous devez être Boutique'
            });
        }

        // Récupérer toutes les boutiques du propriétaire
        const boutiques = await Boutique.find({ ownerId: userId });

        if (!boutiques) {
            return res.status(200).json({
                success: true,
                message: 'Aucune boutique trouvée',
                data: {
                    boutiques: [],
                    totalProduits: 0
                }
            });
        }

        // Créer un tableau avec les infos de chaque boutique
        const boutiquesAvecProduits = await Promise.all(
            boutiques.map(async (boutique) => {
                const nombreProduits = await Produit.countDocuments({
                    store_id: boutique._id
                });
                return {
                    boutique_id: boutique._id,
                    nom_boutique: boutique.name,
                    nombre_produits: nombreProduits,
                    type_produit: "PRODUIT"
                };
            })
        );

        // Calculer le total de tous les produits
        const totalProduits = boutiquesAvecProduits.reduce(
            (sum, boutique) => sum + boutique.nombre_produits,
            0
        );

        res.status(200).json({
            success: true,
            data: {
                boutiques: boutiquesAvecProduits,
                totalBoutiques: boutiques.length,
                totalProduits: totalProduits
            }
        });

    } catch (error) {
        console.error('Erreur récupération produits par boutique:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Produits en rupture de stock pour le propriétaire de boutique
exports.getOutOfStockProductsInMyStore = async (req, res) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token non fourni' });
        }

        const decodedToken = jwt.verify(token, config.jwtSecret);
        if (decodedToken.role !== 'Boutique') {
            return res.status(403).json({ success: false, message: 'Accès refusé: Vous devez être Boutique' });
        }

        const ownerId = decodedToken.id;
        const boutiques = await Boutique.find({ ownerId });
        const boutiqueIds = boutiques.map(b => b._id);

        const outOfStockProducts = await Produit.find({
            store_id: { $in: boutiqueIds },
            type_produit: 'PRODUIT',
            $or: [
                { stock: 0 },
                { stock_etat: false }
            ]
        }).select('nom_prod stock stock_etat store_id image_Url');

        res.status(200).json({
            success: true,
            data: {
                count: outOfStockProducts.length,
                products: outOfStockProducts
            }
        });
    } catch (error) {
        console.error('Erreur rupture de stock:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// Top 5 produits les plus vendus pour le propriétaire de boutique
exports.getTopSellingProductsInMyStore = async (req, res) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token non fourni' });
        }

        const decodedToken = jwt.verify(token, config.jwtSecret);
        if (decodedToken.role !== 'Boutique') {
            return res.status(403).json({ success: false, message: 'Accès refusé: Vous devez être Boutique' });
        }

        const ownerId = decodedToken.id;
        const boutiques = await Boutique.find({ ownerId });
        const boutiqueIds = boutiques.map(b => b._id);

        // Agréger les ventes depuis les achats confirmés
        const topProducts = await Achat.aggregate([
            {
                $match: {
                    status: { $in: ['CONFIRMEE', 'EN_LIVRAISON', 'DELIVREE'] }
                }
            },
            { $unwind: '$items' },
            {
                $match: {
                    'items.store_id': { $in: boutiqueIds }
                }
            },
            {
                $group: {
                    _id: '$items.prod_id',
                    nom_prod: { $first: '$items.nom_prod' },
                    image_url: { $first: '$items.image_url' },
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', { $toDouble: '$items.prix_unitaire' }] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    prod_id: '$_id',
                    nom_prod: 1,
                    image_url: 1,
                    totalQuantity: 1,
                    totalRevenue: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: topProducts
        });
    } catch (error) {
        console.error('Erreur top produits vendus:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Promotions actives pour les produits du propriétaire de boutique
exports.getActivePromotionsInMyStore = async (req, res) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token non fourni' });
        }

        const decodedToken = jwt.verify(token, config.jwtSecret);
        if (decodedToken.role !== 'Boutique') {
            return res.status(403).json({ success: false, message: 'Accès refusé: Vous devez être Boutique' });
        }

        const ownerId = decodedToken.id;
        const boutiques = await Boutique.find({ ownerId });
        const boutiqueIds = boutiques.map(b => b._id);

        // Récupérer les produits de la boutique
        const produits = await Produit.find({ store_id: { $in: boutiqueIds } }).select('_id');
        const produitIds = produits.map(p => p._id);

        const now = new Date();
        const activePromotions = await Promotion.find({
            prod_id: { $in: produitIds },
            est_Active: true,
            debut: { $lte: now },
            fin: { $gte: now }
        }).populate('prod_id', 'nom_prod prix_unitaire image_Url');

        res.status(200).json({
            success: true,
            data: {
                count: activePromotions.length,
                promotions: activePromotions
            }
        });
    } catch (error) {
        console.error('Erreur promotions actives:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Revenu total des boutiques d'une personne en une année
exports.getAnnualRevenueByOwner = async (req, res) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Token non fourni' });
        }

        const decodedToken = jwt.verify(token, config.jwtSecret);
        const role = decodedToken.role;
        const userId = decodedToken.id;

        if (role !== 'Boutique') {
            return res.status(403).json({ success: false, message: 'Accès refusé: Vous devez être Boutique' });
        }

        const { year } = req.query;

        if (!year) {
            return res.status(400).json({ success: false, message: 'Les paramètres "year" et "month" sont requis' });
        }

        const y = parseInt(year);
        const boutiques = await Boutique.find({ ownerId: userId });
        const boutiqueIds = boutiques.map(b => b._id);

        const revenue = await Achat.aggregate([
            {
                $match: {
                    status: { $in: ['CONFIRMEE', 'EN_LIVRAISON', 'DELIVREE'] },
                    createdAt: {
                        $gte: new Date(y, 0, 1),
                        $lt: new Date(y + 1, 0, 1)
                    }
                }
            },
            { $unwind: "$items" },
            {
                $match: {
                    "items.store_id": { $in: boutiqueIds }
                }
            },
            {
                $lookup: {
                    from: "boutiques",
                    localField: "items.store_id",
                    foreignField: "_id",
                    as: "boutiqueInfo"
                }
            },
            { $unwind: "$boutiqueInfo" },
            {
                $group: {
                    _id: {
                        boutiqueId: "$boutiqueInfo._id",
                        boutiqueName: "$boutiqueInfo.name"
                    },
                    totalRevenue: {
                        $sum: { $multiply: ["$items.quantity", { $toDouble: "$items.prix_unitaire" }] }
                    },
                    totalOrders: { $addToSet: "$_id" } // commandes uniques
                }
            },
            {
                $project: {
                    _id: 0,
                    boutiqueId: "$_id.boutiqueId",
                    boutiqueName: "$_id.boutiqueName",
                    year: y,
                    totalRevenue: { $round: ["$totalRevenue", 2] },
                    totalOrders: { $size: "$totalOrders" }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Calcul du revenu global toutes boutiques confondues
        const grandTotal = revenue.reduce((sum, b) => sum + b.totalRevenue, 0);

        res.status(200).json({
            success: true,
            year: y,
            grandTotal: Math.round(grandTotal * 100) / 100,
            data: revenue
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// Revenu obtenu avec chaque produit en un mois
exports.getMonthlyRevenueByProduct = async (req, res) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Token non fourni' });
        }

        const decodedToken = jwt.verify(token, config.jwtSecret);
        const role = decodedToken.role;
        const userId = decodedToken.id;

        if (role !== 'Boutique') {
            return res.status(403).json({ success: false, message: 'Accès refusé: Vous devez être Boutique' });
        }

        const { year, month } = req.query;
        if (!year || !month) {
            return res.status(400).json({ success: false, message: 'Les paramètres "year" et "month" sont requis' });
        }

        const y = parseInt(year);
        const m = parseInt(month);

        const boutiques = await Boutique.find({ ownerId: userId });
        const boutiqueIds = boutiques.map(b => b._id);

        const revenue = await Achat.aggregate([
            {
                $match: {
                    status: { $in: ['CONFIRMEE', 'EN_LIVRAISON', 'DELIVREE'] },
                    createdAt: {
                        $gte: new Date(y, m - 1, 1),
                        $lt: new Date(y, m, 1)
                    }
                }
            },
            { $unwind: "$items" },
            {
                $match: {
                    "items.store_id": { $in: boutiqueIds }
                }
            },
            {
                $lookup: {
                    from: "produits",               // nom de la collection MongoDB
                    localField: "items.prod_id",
                    foreignField: "_id",
                    as: "produitInfo"
                }
            },
            { $unwind: { path: "$produitInfo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "boutiques",
                    localField: "items.store_id",
                    foreignField: "_id",
                    as: "boutiqueInfo"
                }
            },
            { $unwind: "$boutiqueInfo" },
            {
                $group: {
                    _id: {
                        produitId: "$items.prod_id",
                        nomProduit: "$items.nom_prod",
                        boutiqueId: "$boutiqueInfo._id",
                        boutiqueName: "$boutiqueInfo.name"
                    },
                    totalRevenue: {
                        $sum: { $multiply: ["$items.quantity", { $toDouble: "$items.prix_unitaire" }] }
                    },
                    totalQuantitySold: { $sum: "$items.quantity" },
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    produitId: "$_id.produitId",
                    nomProduit: "$_id.nomProduit",
                    boutiqueId: "$_id.boutiqueId",
                    boutiqueName: "$_id.boutiqueName",
                    year: y,
                    month: m,
                    totalRevenue: { $round: ["$totalRevenue", 2] },
                    totalQuantitySold: 1,
                    totalOrders: 1
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        res.status(200).json({
            success: true,
            year: y,
            month: m,
            data: revenue
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};