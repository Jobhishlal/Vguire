import jwt from 'jsonwebtoken';
import User from '../models/userSchema.js';
  
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


export const isAuthenticatedAdmin = (req, res, next) => {
  if (req.session?.admin) {
      return next(); 
  }
  res.redirect('/admin/login');
};

export const preventLoggedInAdmin = (req, res, next) => {
  if (req.session?.admin) {
      return res.redirect('/admin/dashboard');
  }
  next();
};



export const redirectIfAuthenticated = (req, res, next) => {
  console.log('enter');
  
  if (req.session.user) {
      return res.redirect('/user/home'); 
  }
  next();
};




export const isAuth = async (req, res, next) => {
  if (!req.session.user) {
      return res.redirect("/user/login"); 
  }

  try {
      const user = await User.findById(req.session.user);  
      if (!user) {
          return res.redirect("/user/login");
      }
      
      

      req.user = user;  
      next();
  } catch (error) {
      console.error("Error in authentication:", error);
      return res.redirect("/user/login");
  }
};



export const isCheckAuth = (req,res,next)=>{
  if(req.session.user){
    return res.redirect("/user/home")
  }else{
    return next();
  }
}


export const print= (req,res,next)=>{
  console.log('huhuhuhuhuh')
  next()
}


export const adminAuth = (req, res, next) => {
  if (req.session.admin) {
      return next(); 
  }
  res.redirect('/admin/login');
};




export const checkBlockedUser = async (req, res, next) => {
  if (req.session?.user) {
    try {
      
      const user = await User.findById(req.session.user);

     
      if (user?.blocked) {
        return res.render('user/blocked', { message: 'Your account has been blocked. Please contact support.' });
      }
   
      
    } catch (error) {
      console.error("Error checking if user is blocked:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  next();
};






  export default {redirectIfAuthenticated,};


