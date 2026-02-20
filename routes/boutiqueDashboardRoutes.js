const express = require('express');
const router = express.Router();

const {
    getNumberOfProductInStoreOfOwner,
    getOutOfStockProductsInMyStore,
    getTopSellingProductsInMyStore,
    getActivePromotionsInMyStore,
    getBoutiqueRevenueOwner
} = require('../controllers/boutiqueDashboardController');

router.get('/number-of-product-in-my-store', getNumberOfProductInStoreOfOwner);
router.get('/out-of-stock-products', getOutOfStockProductsInMyStore);
router.get('/top-selling-products', getTopSellingProductsInMyStore);
router.get('/active-promotions-in-my-store', getActivePromotionsInMyStore);
router.get('/my-store-revenue', getBoutiqueRevenueOwner);

module.exports = router;