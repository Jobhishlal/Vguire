import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import flash from 'connect-flash';
import passport from './config/passport.js';
import authRoutes from './routes/authRoutes.js'; 
import adminRoutes from './routes/adminRoutes.js';
import path from 'path';
import nocache from 'nocache';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import { fileURLToPath } from 'url';
import { isCheckAuth } from './middlewares/authMiddleware.js';
import { homepage } from "./controllers/homeController.js";


// Load environment variables
dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files correctly
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware configuration
app.use(express.json({ limit: '150mb' }));  // Increase request body size limit
app.use(express.urlencoded({ limit: '150mb', extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(flash());
app.use(nocache())



app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 72 * 60 * 1000
        }
    })
);




app.set('views', path.join(process.cwd(), 'views'));
app.set('view engine', 'ejs');

app.use((req, res, next) => {
    res.locals.flashMessage = req.flash('msg');
    next();
});


app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});



app.use(passport.initialize());
app.use(passport.session());
app.use(authRoutes);

// Google OAuth routes
// app.get('/auth/google',
//     passport.authenticate('google', { scope: ['profile', 'email'] })
// );
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/user/login', failureFlash: true }),
    (req, res) => {
       
        req.session.user = req.user._id; 
        
        res.redirect('/user/home'); 
    }
);
 


app.get('/logout', (req, res) => {
    req.logout((err) => {
        res.redirect('/'); 
    });
});

app.get("/",homepage)
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use((req, res) => {
    if (req.originalUrl.startsWith("/admin")) {
        res.status(404).render("admin/error", { errorMessage: "Admin Page Not Found" });
    } else {
        res.status(404).render("user/error", { errorMessage: "Page Not Found" });
    }
});




const PORT = process.env.PORT || 8010;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Database connection failed:', error);
    });

