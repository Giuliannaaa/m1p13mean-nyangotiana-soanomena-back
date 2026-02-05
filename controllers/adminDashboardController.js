const Boutique = require('../models/Boutique');
const User = require('../models/User');
const Promotion = require('../models/Promotions');

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