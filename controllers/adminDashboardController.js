const mongoose = require('mongoose');
const Boutique = require('../models/Boutique');
const User = require('../models/User');
const Promotion = require('../models/Promotions');
const Achat = require('../models/Achat');
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
        const userId = decodedToken.sub;

        if (role !== 'Boutique') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé: Vous devez être Boutique'
            });
        }

        const ownerObjectId = new mongoose.Types.ObjectId(userId);

        // Find boutiques owned by this user
        // req.user should be populated by auth middleware
        const revenue = await Achat.aggregate([
            {
                $match: {
                    status: { $in: ['CONFIRMEE', 'EN_LIVRAISON', 'DELIVREE'] }
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
            // Filter to ensure the boutique belongs to the requesting user
            // We need to match on boutique.ownerId
            // Since ownerId is an ObjectId in DB but might be string in req.user, let's ensure comparison works
            // However, after lookup/unwind, we can just match
            // Note: ownerId in Boutique is ObjectId. req.user.id is string usuallly? 
            // Better to fetch user's boutique IDs first or match in aggregation?
            // Let's use $match after lookup
            {
                $match: {
                    "boutique.ownerId": ownerObjectId
                }
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
                    "_id.month": -1
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
        const userId = decodedToken.sub;

        if (role !== 'Boutique') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé: Vous devez être Boutique'
            });
        }

        const ownerId = new mongoose.Types.ObjectId(userId);

        // Récupérer toutes les boutiques du propriétaire
        const boutiques = await Boutique.find({ ownerId });

        if (boutiques.length === 0) {
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
                const nombreProduits = await Product.countDocuments({
                    store_id: boutique._id
                });

                return {
                    boutique_id: boutique._id,
                    nom_boutique: boutique.name,
                    nombre_produits: nombreProduits
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