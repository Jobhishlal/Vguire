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
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import { fileURLToPath } from 'url';

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

// Set EJS as the view engine
app.set('views', path.join(process.cwd(), 'views'));
app.set('view engine', 'ejs');

// Flash message middleware
app.use((req, res, next) => {
    res.locals.msg = req.flash('msg');
    next();
});

// Initialize passport authentication
app.use(passport.initialize());
app.use(passport.session());
app.use(authRoutes);

// Google OAuth routes
// app.get('/auth/google',
//     passport.authenticate('google', { scope: ['profile', 'email'] })
// );

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/user/home'); // Redirect to home after successful login
    }
);

// app.get('/user/home', (req, res) => {
//     if (!req.user) {
//         return res.redirect('/auth/google'); // Redirect to Google login if not authenticated
//     }
//     res.render('user/home', { user: req.user }); // Pass the user data to the home.ejs template
// });

// Logout route to destroy session
app.get('/logout', (req, res) => {
    req.logout((err) => {
        res.redirect('/'); // Redirect to homepage after logging out
    });
});

// Routes
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Connect to MongoDB and start the server
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
