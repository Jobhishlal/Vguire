import express from 'express';

import {  isCheckAuth, isAuth, print ,checkBlockedUser} from '../middlewares/authMiddleware.js';
import passport from 'passport';


import { 
    loadSignup, 
    signup, 
    getLoginPage, 
    loginUser, 
    otprecieve, 
    verifyOtp ,
    forgot,
    forgotpasswordhandler,
   
    otpVerification,
    changePassword,
    resendOtp,
    
    shoppage,
    homepage,
    productview,
    logoutUser,
    getprofile,
    postprofile,
    validatepass,
    getaddress,
    postaddress,geteditaddress
    ,posteditaddress,
    deleteaddress,
    searchproduct,
   referralCodeget

    
} from '../controllers/userController.js';

import {getcart,addToCart,updateCartQuantity,removeFromCart} from '../controllers/CartController.js'
import {singlecheckout,cartproduct,placeorder,buyNowCartView,addaddress,editaddress,getcheckout,singleCheckoutView,updateCheckoutQuantity,getorder,ordersucccess,orderdetails,orderview,ordercancel,ratingadd,createRazorpayOrder,verifyPayment,couponapplied} from '../controllers/checkoutController.js'
import { profileUpload } from '../middlewares/multerConfig.js';
import {getwishlist, postwishlist,togglewishlist,wishlistcount} from '../controllers/wishlistController.js';
import {createorder} from '../controllers/peymentController.js'

const router = express.Router();

// Signup routes
router.get('/signup',loadSignup);
router.post('/signup', signup);

// OTP routes
router.get('/otp', otprecieve);
router.post('/verify-otp', verifyOtp);

// Login routes
router.get('/login',isCheckAuth, getLoginPage);
router.post('/login',loginUser);

//forgot password
router.get('/logout',logoutUser)

router.get('/forgot-password',forgot)
router.post('/forgot-password',forgotpasswordhandler);

//reset_password

router.post('/reset-password',changePassword) 
//forgot otp
router.post('/forgotverify-otp',otpVerification)

router.post('/resend-otp',resendOtp)
//user block check router 



router.get('/home',checkBlockedUser,isAuth,homepage)
router.get('/shop', checkBlockedUser,shoppage)
router.get('/productview/:id',checkBlockedUser,productview)

//google
router.get('/auth/google', print, passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get('/profile',isAuth,checkBlockedUser,getprofile);
router.post('/profile/edit',isAuth,checkBlockedUser,profileUpload,postprofile)
router.post('/profile/validate-password',checkBlockedUser, isAuth, validatepass);



router.get('/address',checkBlockedUser,isAuth,getaddress);
router.post('/add-address',checkBlockedUser,isAuth,postaddress)
router.get('/edit-address/:id',checkBlockedUser,isAuth,geteditaddress)
router.post('/edit-address/:id',checkBlockedUser,isAuth,posteditaddress)

router.post('/delete-address/:id',checkBlockedUser,deleteaddress)



router.get("/cart",isAuth,checkBlockedUser, getcart);
router.post("/add-to-cart",isAuth ,checkBlockedUser,addToCart);
router.post("/update-cart-quantity",isAuth,checkBlockedUser, updateCartQuantity);
router.post("/remove-from-cart/:itemId",isAuth ,checkBlockedUser,removeFromCart);

router.get("/checkout",isAuth,checkBlockedUser,getcheckout);
router.post("/checkout/buy-now",isAuth,checkBlockedUser,singlecheckout)
router.get("/checkout/single", isAuth,checkBlockedUser, singleCheckoutView);
router.post("/checkout/buy-now-cart",isAuth,checkBlockedUser,cartproduct)
router.get("/checkout/buy-now-cart", isAuth,checkBlockedUser, buyNowCartView);
router.post("/address/add",isAuth,checkBlockedUser,addaddress)
router.post("/address/edit/:id",isAuth,checkBlockedUser,editaddress)
router.post("/checkout/update-quantity", isAuth,checkBlockedUser,updateCheckoutQuantity);




router.post("/checkout/placeorder",isAuth,checkBlockedUser,placeorder)
router.get("/orders",isAuth,checkBlockedUser,getorder)
router.get('/order-success',isAuth,checkBlockedUser,ordersucccess)

router.get('/order-details/',isAuth,checkBlockedUser,orderdetails)
router.get('/order-view/:orderId',isAuth,checkBlockedUser,orderview)

router.post("/order/cancel/:orderId/:productId", isAuth,checkBlockedUser, ordercancel);
router.post("/order/rate-product", isAuth,checkBlockedUser, ratingadd);



router.get('/search',isAuth,checkBlockedUser,searchproduct)

router.get("/referral",isAuth,checkBlockedUser,referralCodeget)


router.get("/wishlist",isAuth,checkBlockedUser,getwishlist)
router.post("/wishlist",isAuth,checkBlockedUser,postwishlist)
router.post("/wishlist/toggle",isAuth,checkBlockedUser,togglewishlist)
router.get("/wishlist/count",isAuth,checkBlockedUser,wishlistcount);
router.post("/create-order",isAuth,checkBlockedUser,createorder)
router.post("/checkout/razorpay-order",isAuth,checkBlockedUser, createRazorpayOrder);
router.post("/checkout/verify-payment",isAuth,checkBlockedUser, verifyPayment);
router.post("/checkout/apply-coupon",isAuth,checkBlockedUser,couponapplied)



export default router;

