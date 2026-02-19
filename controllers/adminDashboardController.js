const mongoose = require('mongoose');
const Boutique = require('../models/Boutique');
const User = require('../models/User');
const Promotion = require('../models/Promotions');
const Achat = require('../models/Achat');
const Produit = require('../models/Produits');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Prendre le nombre des boutiques actives
exports.getActiveStoreNumber = async (req, res) => {
    try {
        const data = await Boutique.countActiveStores();
        res.json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Prendre le nombre des acheteurs actifs
exports.getActiveBuyersNumber = async (req, res) => {
    try {
        const data = await User.countActiveBuyers();
        res.json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Prendre le nombre des promotions actives
exports.getActivePromotionsNumber = async (req, res) => {
    try {
        const data = await Promotion.countActivePromotions();
        res.json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Prendre le nombre des utilisateurs ayant un role boutique qui ne sont pas validés(actifs)
exports.getInactiveBoutiqueUsersNumber = async (req, res) => {
    try {
        const data = await User.countInactiveBoutiqueUsers();
        res.json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Récupérer les statistiques actives (boutiques + acheteurs)
exports.getAdminDashboardData = async (req, res) => {
    try {
        const [activeStores, activeBuyers, activePromotions, inactiveBoutiqueUsers, totalStores, totalBuyers, totalPromotions] = await Promise.all([
            Boutique.countActiveStores(),
            User.countActiveBuyers(),
            Promotion.countActivePromotions(),
            User.countInactiveBoutiqueUsers(),

            Boutique.countTotalStores(),
            User.countTotalBuyers(),
            Promotion.countTotalPromotions()
        ]);

        res.json({
            success: true,
            data: {
                activeStores,
                activeBuyers,
                activePromotions,
                inactiveBoutiqueUsers,
                totalStores,
                totalBuyers,
                totalPromotions
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 1. Chiffre d'affaire par boutique (Vue Admin: Annuel-Mensuel)
exports.getRevenuePerBoutiqueAdmin = async (req, res) => {
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

        const { year, month } = req.query;

        const decodedToken = jwt.verify(token, config.jwtSecret);
        const role = decodedToken.role;

        if (role !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé: Vous devez être Admin'
            });
        }

        const revenue = await Achat.aggregate([
            {
                $match: {
                    status: { $in: ['CONFIRMEE', 'EN_LIVRAISON', 'DELIVREE'] },
                    createdAt: {
                        $gte: new Date(year, month - 1, 1),
                        $lt: new Date(year, month, 1)
                    }
                }
            },
            {
                $unwind: "$items"
            },
            {
                $lookup: {
                    from: "boutiques",
                    localField: "items.store_id",
                    foreignField: "_id",
                    as: "boutique"
                }
            },
            {
                $unwind: "$boutique"
            },
            {
                $group: {
                    _id: {
                        boutiqueId: "$boutique._id",
                        boutiqueName: "$boutique.name",
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    totalRevenue: {
                        $sum: { $multiply: ["$items.quantity", "$items.prix_unitaire"] }
                    }
                }
            },
            {
                $sort: {
                    "_id.year": -1,
                    "_id.month": -1,
                    totalRevenue: -1
                }
            },
            {
                $project: {
                    _id: 0,
                    boutiqueName: "$_id.boutiqueName",
                    year: "$_id.year",
                    month: "$_id.month",
                    revenue: "$totalRevenue"
                }
            }
        ]);


        res.status(200).json({
            success: true,
            data: revenue
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 2. Nombre de boutique par catégorie (Admin)
exports.getBoutiqueCountByCategory = async (req, res) => {
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

        if (role !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé: Vous devez être Admin'
            });
        }

        const categoryCounts = await Boutique.aggregate([
            {
                $match: { isValidated: true } // Only active boutiques? Assuming yes based on context
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "categoryId",
                    foreignField: "_id",
                    as: "category"
                }
            },
            {
                $unwind: "$category"
            },
            {
                $group: {
                    _id: "$category.nom_cat",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    category: "$_id",
                    count: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: categoryCounts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

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

        // Find boutiques owned by this user
        const revenue = await Achat.aggregate([
            {
                $match: {
                    status: { $in: ['CONFIRMEE', 'EN_LIVRAISON', 'DELIVREE'] },
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

// 4. Top 5 boutiques les plus actives (par nombre de commande)
exports.getTop5ActiveBoutiques = async (req, res) => {
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

        if (role !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé: Vous devez être Admin'
            });
        }

        const topBoutiques = await Achat.aggregate([
            {
                $match: {
                    status: { $in: ['CONFIRMEE', 'EN_LIVRAISON', 'DELIVREE'] }
                }
            },
            {
                $unwind: "$items"
            },
            {
                $group: {
                    _id: "$items.store_id",
                    orderCount: { $sum: 1 } // Counting items sold or orders? 
                    // "par nombre de commande" usually means number of distinct orders. 
                    // But an order can have multiple items from same boutique.
                    // If we want "number of orders containing items from this boutique":
                }
            },
            // Wait, if an Achat has multiple items from same boutique, it's 1 order for that boutique.
            // But Achat structure has items array. 
            // If I unwind items, I get 1 doc per item.
            // If I group by Achat._id + BoutiqueId, then count, that's better.
            // Let's retry the grouping logic.
        ]);

        // Accessing Achat collection directly might count item lines. 
        // Correct approach for "Orders per boutique":
        // 1. Unwind items
        // 2. Group by AchatId + StoreId to get unique Boutique-Order pairs
        // 3. Group by StoreId to count those pairs.

        const realTopBoutiques = await Achat.aggregate([
            {
                $match: {
                    status: { $in: ['CONFIRMEE', 'EN_LIVRAISON', 'DELIVREE'] }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: { achatId: "$_id", storeId: "$items.store_id" }
                }
            },
            {
                $group: {
                    _id: "$_id.storeId",
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $sort: { totalOrders: -1 }
            },
            {
                $limit: 5
            },
            {
                $lookup: {
                    from: "boutiques",
                    localField: "_id",
                    foreignField: "_id",
                    as: "boutique"
                }
            },
            {
                $unwind: "$boutique"
            },
            {
                $project: {
                    _id: 0,
                    boutiqueName: "$boutique.name",
                    totalOrders: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: realTopBoutiques
        });

    } catch (error) {
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