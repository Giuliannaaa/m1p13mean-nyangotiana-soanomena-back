const express = require('express');
const router = express.Router();

const {
    getNumberOfProductInStoreOfOwner,
    getOutOfStockProductsInMyStore,
    getTopSellingProductsInMyStore,
    getActivePromotionsInMyStore,
    getBoutiqueRevenueOwner,
    getAnnualRevenueByOwner,
    getMonthlyRevenueByProduct
} = require('../controllers/boutiqueDashboardController');

router.get('/number-of-product-in-my-store', getNumberOfProductInStoreOfOwner);
router.get('/out-of-stock-products', getOutOfStockProductsInMyStore);
router.get('/top-selling-products', getTopSellingProductsInMyStore);
router.get('/active-promotions-in-my-store', getActivePromotionsInMyStore);
router.get('/my-store-revenue', getBoutiqueRevenueOwner);
router.get('/annual-revenue-by-owner', getAnnualRevenueByOwner);
router.get('/monthly-revenue-by-product', getMonthlyRevenueByProduct);

module.exports = router;