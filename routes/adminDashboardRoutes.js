const express = require('express');
const {
    getActiveStoreNumber,
    getActiveBuyersNumber,
    getAdminDashboardData,
    getInactiveBoutiqueUsersNumber
} = require('../controllers/adminDashboardController');
const router = express.Router();

router.get('/active-stores', getActiveStoreNumber);
router.get('/active-buyers', getActiveBuyersNumber);
router.get('/inactive-boutique-users', getInactiveBoutiqueUsersNumber);
router.get('/data', getAdminDashboardData);

module.exports = router;