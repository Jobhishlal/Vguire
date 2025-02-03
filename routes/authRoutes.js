import express from 'express';
import passport from 'passport';
import { loginPage, homePage, logout } from '../controllers/authController.js';


import { ensureAuth,ensureGuest } from '../middlewares/authMiddleware.js';
const router = express.Router();

// Login Page
router.get('/login', ensureGuest, loginPage);

// Google Auth


// Google Callback


// Home Page
router.get('/home', ensureAuth, homePage);

// Logout
router.get('/logout', logout);

export default router;
