import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { ensureGuest } from '../middlewares/authMiddleware.js';
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
    // resetget,
    otpVerification,
    changePassword,
    resendOtp,
    
} from '../controllers/userController.js';

const router = express.Router();

// Signup routes
router.get('/signup', loadSignup);
router.post('/signup', signup);

// OTP routes
router.get('/otp', otprecieve);
router.post('/verify-otp', verifyOtp);

// Login routes
router.get('/login', getLoginPage);
router.post('/login', loginUser);

//forgot password

router.get('/forgot-password',forgot)
router.post('/forgot-password',forgotpasswordhandler);

//reset_password
// router.get('/reset_password',resetget) 
router.post('/reset-password',changePassword) 
//forgot otp
router.post('/forgotverify-otp',otpVerification)

router.post('/resend-otp',resendOtp)



router.get('/home', isAuthenticated, (req, res) => {
    res.render('home', { user: req.user });
});

//google
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


export default router;


