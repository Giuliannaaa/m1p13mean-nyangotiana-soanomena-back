const express = require('express');
const {
    getActiveStoreNumber,
    getActiveBuyersNumber,
    getAdminDashboardData,
    getInactiveBoutiqueUsersNumber,
    getRevenuePerBoutiqueAdmin,
    getBoutiqueCountByCategory,
    getBoutiqueRevenueOwner,
    getTop5ActiveBoutiques,
    getNumberOfProductInStoreOfOwner
} = require('../controllers/adminDashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/active-stores', getActiveStoreNumber);
router.get('/active-buyers', getActiveBuyersNumber);
router.get('/inactive-boutique-users', getInactiveBoutiqueUsersNumber);
router.get('/data', getAdminDashboardData);

router.get('/revenue-per-store', getRevenuePerBoutiqueAdmin);
router.get('/store-count-by-category', getBoutiqueCountByCategory);
router.get('/my-store-revenue', getBoutiqueRevenueOwner);
router.get('/top-5-stores', getTop5ActiveBoutiques);
router.get('/number-of-product-in-my-store', getNumberOfProductInStoreOfOwner);

module.exports = router;