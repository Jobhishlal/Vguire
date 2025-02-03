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


export const redirectIfAuthenticated = (req, res, next) => {
  console.log('enter');
  
  if (req.session.user) {
      return res.redirect('/user/home'); 
  }
  next();
};



// export const isAuth = async (req, res, next) => {
//   if (req.user&&!req.session.user) {
//       return res.redirect("/user/login"); 
//   }

//   try {
//       const user = await User.findById(req.session.user);
//       if (!user) {
//           return res.redirect("/user/login");
//       }

//       req.user = user;  
//       next();
//   } catch (error) {
//       console.error("Error in authentication:", error);
//       res.redirect("/user/login");
//   }
// };



export const isAuth = async (req, res, next) => {
  if (!req.session.user) {
      return res.redirect("/user/login"); 
  }

  try {
      const user = await User.findById(req.session.user);  // Correctly cast ObjectId here
      if (!user) {
          return res.redirect("/user/login");
      }

      req.user = user;  // Ensure req.user is the actual user object
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





  export default {redirectIfAuthenticated,};


