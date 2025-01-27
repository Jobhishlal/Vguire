

import jwt from 'jsonwebtoken';
  
export const ensureAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

export const ensureGuest = (req, res, next) => {
    if (!req.isAuthenticated()) { 
        return next();
    }
    res.redirect('/home');
};

 export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};



export const isAuthenticatedAdmin = async (req, res, next) => {
  const token = req.cookies.admin_token;

  if (!token) {
    return res.redirect('/admin/login'); 
  }

  try {
    const decoded = jwt.verify(token, 'jobhisecret');  
    req.admin = decoded.id;  
    next();  
  } catch (err) {
    console.error(err);
    return res.redirect('/admin/login');  
  }
};





export default isAuthenticated;


