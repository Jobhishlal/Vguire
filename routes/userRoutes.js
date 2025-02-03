import express from 'express';

import {  isCheckAuth, isAuth, print} from '../middlewares/authMiddleware.js';
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
    validatepass
    
    
} from '../controllers/userController.js';
import { profileUpload } from '../middlewares/multerConfig.js';

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



router.get('/home',isAuth,homepage)
router.get('/shop',shoppage)
router.get('/productview/:id',productview)

//google
router.get('/auth/google', print, passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get('/profile',isAuth,getprofile);
router.post('/profile/edit',isAuth,profileUpload,postprofile)
router.post('/profile/validate-password', isAuth, validatepass);



export default router;


