const express = require('express');
const {
    getActiveStoreNumber,
    getActiveBuyersNumber,
    getAdminDashboardData,
    getInactiveBoutiqueUsersNumber,
    getRevenuePerBoutiqueAdmin,
    getBoutiqueCountByCategory,
    getTop5ActiveBoutiques,
} = require('../controllers/adminDashboardController');
const router = express.Router();

router.get('/active-stores', getActiveStoreNumber);
router.get('/active-buyers', getActiveBuyersNumber);
router.get('/inactive-boutique-users', getInactiveBoutiqueUsersNumber);
router.get('/data', getAdminDashboardData);

router.get('/revenue-per-store', getRevenuePerBoutiqueAdmin);
router.get('/store-count-by-category', getBoutiqueCountByCategory);
router.get('/top-5-stores', getTop5ActiveBoutiques);
module.exports = router;