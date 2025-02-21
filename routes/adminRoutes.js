import express from 'express';

import { renderLoginPage, authenticateAdmin, renderDashboard, logoutAdmin } from '../controllers/adminController.js';

import { productUpload, categoryUpload,processProductImages } from '../middlewares/multerConfig.js';


import * as productController from '../controllers/productController.js';
import * as adminuserController from '../controllers/adminuserController.js';
import { addCategory, showCategories, getEditCategory, updateCategory ,list,applyCategoryOffer,applyCategoryOfferPost,removeCategoryOffer} from '../controllers/categoryController.js';
import * as adminorderController from '../controllers/adminordercontroller.js';
import * as couponcontroller from '../controllers/couponcontroller.js';
import * as dashboardController from '../controllers/dashboardController.js'

import { isAuthenticatedAdmin, preventLoggedInAdmin } from '../middlewares/authMiddleware.js';
import { error } from 'console';

const router = express.Router();

// Admin routes
router.get('/login', preventLoggedInAdmin, renderLoginPage);
router.post('/login', preventLoggedInAdmin, authenticateAdmin);

router.get('/dashboard', isAuthenticatedAdmin, renderDashboard);
router.get('/logout', isAuthenticatedAdmin, logoutAdmin);

// Product routes
router.get('/product', isAuthenticatedAdmin, productController.showProducts);
router.get('/add-product',productController.getproduct)
router.post('/add-product', isAuthenticatedAdmin, productUpload, processProductImages, productController.addProduct);
router.get('/edit-product/:id',productController.getEditProduct);
router.post('/edit-product/:id',productUpload,processProductImages,productController.postEditProduct);

router.post("/listproduct/:id", productController.list);






// User management routes
router.get('/usersmanagement', isAuthenticatedAdmin, adminuserController.getUsers);  
router.post('/toggleBlock/:email', isAuthenticatedAdmin, adminuserController.toggleBlockUser);  

// Category routes
router.get('/categories', isAuthenticatedAdmin, showCategories);
router.get('/add-category', isAuthenticatedAdmin, (req, res) => {
    res.render('admin/add-category', { 
        messages: {
            success: req.flash("success"), 
            error: req.flash("error")
        }
    });
});

router.post('/add-category', isAuthenticatedAdmin, categoryUpload, addCategory);
router.get('/edit-category/:id', isAuthenticatedAdmin, getEditCategory);
router.post('/edit-category/:id', isAuthenticatedAdmin, categoryUpload, updateCategory);

router.post("/listcategory/:id" ,list)

router.post('/delete-image', productController.deleteimage)



router.get('/ordermanagement',adminorderController.getorder)
router.get("/ordermanagement/:orderId", adminorderController.getOrderDetails);

router.post("/ordermanagement/:orderId/update-status", adminorderController.updateOrderStatus);

// offer

router.get("/product/:id/offer",productController.offerpage)
router.post("/product/:id/offer",productController.offerpost)
router.get("/product/:id/remove-offer",productController.removeoffer)
router.get("/category/:id/offer", applyCategoryOffer);
router.post("/category/:id/offer", applyCategoryOfferPost);
router.delete('/category/:id/remove-offer', removeCategoryOffer);



router.get("/referraloffer",isAuthenticatedAdmin,adminuserController.referorder)
router.get("/referraldiscount",isAuthenticatedAdmin,adminuserController.referraldiscount)
router.post('/apply-offer',isAuthenticatedAdmin,adminuserController.applyoffer)

router.get('/coupons',isAuthenticatedAdmin,couponcontroller.getcoupon)
router.get('/coupons/add', (req, res) => {
    res.render('admin/coupon-add'); 
  });
router.post("/coupons",isAuthenticatedAdmin,couponcontroller.addcoupon);
router.delete("/coupons/remove/:id",isAuthenticatedAdmin,couponcontroller.removecoupon)
router.get("/coupons/edit/:id",isAuthenticatedAdmin, couponcontroller.editCouponForm);
router.put("/coupons/edit/:id",isAuthenticatedAdmin,couponcontroller.editCoupon);



router.get("/sales-report",isAuthenticatedAdmin,dashboardController.salesreportget)

export default router;