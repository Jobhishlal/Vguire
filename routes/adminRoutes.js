import express from 'express';

import { renderLoginPage, authenticateAdmin, renderDashboard, logoutAdmin } from '../controllers/adminController.js';
import { isAuthenticatedAdmin ,} from '../middlewares/authMiddleware.js';
import { productUpload, categoryUpload,processProductImages } from '../middlewares/multerConfig.js';

import * as productController from '../controllers/productController.js';
import * as adminuserController from '../controllers/adminuserController.js';
import { addCategory, showCategories, getEditCategory, updateCategory ,list} from '../controllers/categoryController.js';
import { error } from 'console';

const router = express.Router();

// Admin routes
router.get('/login', renderLoginPage);
router.post('/login', authenticateAdmin);

router.get('/dashboard', isAuthenticatedAdmin, renderDashboard);
router.get('/logout', logoutAdmin);

// Product routes
router.get('/product', isAuthenticatedAdmin, productController.showProducts);
router.get('/add-product',productController.getproduct)
router.post('/add-product', isAuthenticatedAdmin, productUpload, processProductImages, productController.addProduct);
router.get('/edit-product/:id',productController.getEditProduct);
router.post('/edit-product/:id',productUpload,processProductImages,productController.postEditProduct);

router.post("/listproduct/:id", productController.list);






// User management routes
router.get('/usersmanagement', isAuthenticatedAdmin, adminuserController.getUsers);  
router.get('/toggleBlock/:email', isAuthenticatedAdmin, adminuserController.toggleBlockUser);  

// Category routes
router.get('/categories', isAuthenticatedAdmin, showCategories);
router.get('/add-category', isAuthenticatedAdmin, (req, res) => {
    const error = req.flash('error')
    res.render('admin/add-category',{error:error.length>0 ?error[0]:null});
});
router.post('/add-category', isAuthenticatedAdmin, categoryUpload, addCategory);

router.get('/edit-category/:id', isAuthenticatedAdmin, getEditCategory);
router.post('/edit-category/:id', isAuthenticatedAdmin, categoryUpload, updateCategory);

router.post("/listcategory/:id" ,list)

router.post('/delete-image', productController.deleteimage)
   


export default router;