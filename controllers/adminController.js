import Admin from '../models/admin.js';

export const renderLoginPage = (req, res) => {
    res.render('admin/adminlogin', { errorMessage: '' });
};

export const authenticateAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.render('admin/adminlogin', { errorMessage: 'Invalid email or password' });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.render('admin/adminlogin', { errorMessage: 'Invalid email or password' });
        }

        req.session.admin = { id: admin._id, email: admin.email };

        req.session.cookie.maxAge = 60 * 60 * 1000; 

        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        return res.status(500).send('Server Error');
    }
};

export const renderDashboard = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect('/admin/login'); 
        }

        const admin = await Admin.findById(req.session.admin.id);
        if (!admin) {
            return res.status(404).send('Admin not found');
        }

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.render('admin/dashboard', { admin });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

export const logoutAdmin = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send("Server Error");
        }

        
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.redirect('/admin/login');
    });
};
