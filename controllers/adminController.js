import Admin from '../models/admin.js';
import jwt from 'jsonwebtoken';
import { isAuthenticatedAdmin } from '../middlewares/authMiddleware.js';

export const renderLoginPage = (req, res) => {
  res.render('admin/adminlogin',{errorMessage:''});  
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
  
     
      const token = jwt.sign({ id: admin._id }, 'jobhisecret', { expiresIn: '1h' });
  
 
      res.cookie('admin_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  
      return res.redirect('/admin/dashboard');
    
      
  
    } catch (err) {
      console.error(err);
      return res.status(500).send('Server Error');
    }
  };
 


  export const renderDashboard = async (req, res) => {
    try {
      const admin = await Admin.findById(req.admin);  
      if (!admin) {
        return res.status(404).send('Admin not found');
      }
  
      res.render('admin/dashboard', { admin });  
  
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  };
  
export const logoutAdmin = async (req, res) => {
  res.clearCookie('admin_token');
  res.redirect('/admin/login');
};


export const productview  = async (req,res)=>{
  res.render('admin/product')
}