import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';    
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/userSchema.js'; 
import { error, log } from 'console';
import exp from 'constants';
import Category from '../models/category.js';
import Product from '../models/products.js'; 
import Address from '../models/address.js';
import Cart from '../models/cart.js';
import Order from '../models/order.js';
import flash from 'express-flash';
import passport from 'passport';
import path from 'path';
import fs from 'fs'




const generateOtp = () => {
    return crypto.randomInt(100000, 999999); 
};  

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,  
                pass: process.env.EMAIL_PASS,       
            },
        });

        const mailOptions = {
            from: "jobishlal761@gmail.com",
            to: email,
            subject: 'Your OTP for Signup',
            text: `Your OTP is: ${otp}\nPlease use this to verify your account.`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
}

// export const loadSignup = (req, res) => {
//     res.render('user/signup', { flashMessage: req.flash('msg') });
// };


// const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
// const validatepassword=(password)=>{
//     return passwordRegex.test(password)
// }


// export const signup = async (req, res) => {
//     const { fname, lname, email, password, cpassword } = req.body;
//     console.log(req.body);

//     const data = {
//         fname: fname,
//         lname: lname,
//         email: email,
//         password: password,
//         cpassword: cpassword
//     };

//     req.session.details = data;
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }
//     if(!validatepassword(password)){
        
//         req.flash(msg, 'Password must be 8-16 chars, include uppercase, lowercase, number & special char.');

//         return res.redirect('/user/signup')
//     }   

//     if (password !== cpassword) {
//         req.flash('msg', 'Passwords do not match');
//         return res.redirect('/user/signup' ); 
//     }

//     try {
//         const existingUser = await User.findOne({ email });
//         if (existingUser) {
//             req.flash(msg, 'User with this email already exists');
//             return res.redirect('/user/signup'); 
//         }

//         const saltRounds = 10;
//         const hashedPassword = await bcrypt.hash(password, saltRounds);
//         const otp = generateOtp();  
//         const emailSent = await sendVerificationEmail(email, otp);
//         console.log("Email sent: ", emailSent);

//         if (!emailSent) {
//             req.flash(msg, 'Failed to send verification email. Try again later.');
//             return res.redirect('/user/signup'); 
//         }

//         req.session.otp = otp;
//         req.session.email = email;
//         req.flash(msg, 'OTP sent to your email. Please verify.');
//         return res.redirect('/user/otp'); 
//     } catch (err) {
//         console.error('Error in signup:', err);
//         res.status(500).send('Server error');
//     }
// };



export const loadSignup = (req, res) => {
    res.render('user/signup', {  message: req.flash('err') });
};

const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
const validatepassword = (password) => {
    return passwordRegex.test(password);
};


export const signup = async (req, res) => {
    const { fname, lname, email, password, cpassword } = req.body;
    
    const data = {
        fname,
        lname,
        email,
        password,
        cpassword
    };

    req.session.details = data;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    if (!validatepassword(password)) {
        req.flash('err', 'Password must be 8-16 chars, include uppercase, lowercase, number & special char.');
        return res.redirect('/user/signup');
    }

    if (password !== cpassword) {
        req.flash('err', 'Passwords do not match');
        return res.redirect('/user/signup');
    }
   

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('err', 'User with this email already exists');
            return res.redirect('/user/signup');
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            req.flash('err', 'Failed to send verification email. Try again later.');
            return res.redirect('/user/signup');
        }

        req.session.otp = otp;
        req.session.email = email;
        req.flash('err', 'OTP sent to your email. Please verify.');
        console.log(otp);
        
        return res.redirect('/user/otp');
    } catch (err) {
        console.error('Error in signup:', err);
        res.status(500).send('Server error');
    }
};


// export const otprecieve = (req, res) => {
//     const email = req.session.userEmail; 
//     const msg= req.flash('msg','message')
//     res.render('user/otp', { userEmail: email ,msg:msg.length?msg[0]:null});  
// };

export const otprecieve = (req, res) => {
    const email = req.session.userEmail;
    const err = req.flash('err');  // Use 'err' instead of 'msg' for flash message
    console.log('Flash message passed to OTP page:', err); // Log the flash message for debugging
    res.render('user/otp', { userEmail: email, err: err.length > 0 ? err[0] : null }); // Pass 'err' to the OTP page
};

export const verifyOtp = async (req, res) => {
    const { otp } = req.body;
    const data = req.session.details;
    const email = data.email;
    const storedOtp = req.session.otp;
    const otpSentAt = req.session.otpSentAt;

    // If either email or OTP is missing, set a flash message and redirect
    if (!email || !otp) {
        req.flash('err', 'Please enter both OTP and Email');  // Use 'err' instead of 'msg'
        return res.redirect('/user/otp');
    }
    console.log('Flash message set:', req.flash('err')); // Log the flash message

    try {
        // OTP expiry check
        const otpExpiryTime = 1 * 60 * 1000; // OTP expiry time of 1 minute
        if (Date.now() - otpSentAt > otpExpiryTime) {
            req.flash('err', 'OTP has expired. Please request a new OTP.');  // Use 'err' instead of 'msg'
            req.session.otp = null; // Clear OTP in session
            return res.redirect('/user/otp');
        }

        if (parseInt(otp) !== storedOtp) {
            req.flash('err', 'Invalid OTP');  // Use 'err' instead of 'msg'
            return res.redirect('/user/otp');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const newUser = new User({
            fname: data.fname,
            lname: data.lname,
            email: data.email,
            password: hashedPassword,
            otp: null,  // Reset OTP
            verified: true,  // Set the user as verified
        });

        await newUser.save();

        // Clear OTP and user details after saving
        req.session.otp = null;
        req.session.details = null;

        req.flash('err', 'User verified successfully.');  // Use 'err' instead of 'msg'
        return res.redirect('/user/home'); // Redirect to user home page after successful registration

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).send('Server error');
    }
};


export const getLoginPage = (req, res) => {
    if (req.session.isLogged) {
        return res.redirect('/user/home'); 
    }
    const error = req.flash("error"); 
    res.render("user/login", { error: error.length > 0 ? error[0] : null }); 
};





export const loginUser = async (req, res) => {
    
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('user/login', { error: 'Invalid email or password' });
        }

        if (!user.verified) {
            return res.render('user/login', { error: 'Please verify your account first.' });
        }
        if (user.blocked) {
            return res.render('user/login',{error:'User  blocked'})
          }
        

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch ) {
            return res.render('user/login', { error: 'Invalid email or password' });
        }
        
        req.session.isLogged=true
        console.log('done');
        console.log( req.session.isLogged);
        
        
        req.session.user = user._id; 
        console.log(user._id);
        console.log(req.session.user);
        
        
        res.redirect('/user/home')
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};


export const logoutUser=(req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                 return res.redirect('/user/home')
            }
            res.redirect('/user/login')

        })
    } catch (error) {
        
    }
}






export const forgot = async (req, res) => {
    res.render('user/forgot-password');
};


export const forgotpasswordhandler = async (req, res) => {
    const { email } = req.body;
    
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.render('user/forgot-password', { msg: "No account found with this email." });
        }

        const otpSentAt = req.session.otpSentAt || 0;  
        const otpExpiryTime = 1 * 60 * 1000;  

    
        if (Date.now() - otpSentAt < otpExpiryTime) {
            const timeRemaining = Math.floor((otpExpiryTime - (Date.now() - otpSentAt)) / 1000);
            return res.render('user/forgot-password', { msg: `Please wait ${timeRemaining} seconds to resend OTP.` });
        }

       
        const otp = Math.floor(100000 + Math.random() * 900000);  
        req.session.otp=otp;
        req.session.userEmail=email
        req.session.otpSentAt = Date.now();  
      console.log('genarate:',otp);
      
        console.log(otp);
        

       
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP to reset the password is: ${otp}`
        };

        await transporter.sendMail(mailOptions);
        req.session.user=email
       
        res.render('user/verify-otp', { msg: "OTP sent to your email. Please verify." });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};

export const resendOtp = async (req, res) => {
    console.log('resend otpyil kayri');
    
    const email = req.session.email; 
    if (!email) {
        return res.redirect('/user/login'); 
    }

    try {
        const otp = Math.floor(10000 + Math.random() * 900000); 
        req.session.otp = otp;
        req.session.otpSentAt = Date.now(); 

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS  
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your new OTP to reset your password is: ${otp}`
        };

        await transporter.sendMail(mailOptions);
        
        
        res.json({ success: true, msg: 'OTP has been sent to your email account' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, msg: 'Server error. Try again later.' });
    }
};

export const otpVerification = async (req, res) => {
    const { otp } = req.body;
    
    try {
        const user = req.session.user;
        const checkOtp = req.session.otp;

       
        if (checkOtp != otp) {
            return res.render('user/verify-otp', { msg: "Invalid or expired OTP" });
        }

        
        res.render('user/reset-password');  

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};


export const resetchange = async (req, res) => {
    const { email, password, confirmpassword } = req.body;

    if (password !== confirmpassword) {
        return res.render('user/reset-password', { msg: "Passwords do not match", email });
    }

    try {
        const user = await User.findOne({ email });


        if (!user || user.resetpasswordexpires < Date.now()) {
            return res.render('user/reset-password', { msg: "Invalid or expired token", email });
        }
       

        
        const saltRounds = 10;
        user.password = await bcrypt.hash(password, saltRounds);
        user.resetPasswordtoken = null;
        user.resetpasswordexpires = null;
        await user.save();

        res.redirect('/user/login');  
        
    } catch (error) {
        console.error(error);

        res.status(500).send("Server error");
    }
};


export const changePassword = async (req, res) => {
    console.log('Change password started');
  
    
    
    try {
        
        const { password } = req.body;
        console.log('Request body:', req.body);
        if (!password || typeof password !== 'string') {
            console.error('Invalid password');
            return res.render('user/reset-password', { 'err': "Password is required and must be a valid string" });
        }
        if(!validatepassword(password)){
            return res.render('user/reset-password',{'err':'password make strong'})
        }
        
 
        console.log('Password validation passed');

      
        const email = req.session.user;
        console.log('Email from session:', email);

       
        const user = await User.findOne({ email });
        console.log('User found:', user);

        if (!user) {
            console.error('User not found');
            return res.render('user/reset-password', { 'err': "User not found" });
        }

        console.log('Hashing password...');
      
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        
        const updatedUser = await User.findOneAndUpdate(
            { email: email },  
            { password: hashedPassword },  
            { new: true }  
        );

        console.log('Password updated successfully:', updatedUser);
        return res.render("user/login",{error});  

    } catch (err) {
        console.error("Error while changing password:", err);
        res.status(500).send("Server error");
    }
};




export const homepage = async (req, res) => {
    try {
        const { sort } = req.query;

        let sortQuery = {};
        if (sort === "price-asc") sortQuery = { price: 1 };
        if (sort === "price-desc") sortQuery = { price: -1 };
        if (sort === "name-asc") sortQuery = { name: 1 };
        if (sort === "name-desc") sortQuery = { name: -1 };

        let products = await Product.find({ isdelete: false });

        if (sort === "name-asc") {
            products = products.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        } else if (sort === "name-desc") {
            products = products.sort((a, b) => b.name.toLowerCase().localeCompare(a.name.toLowerCase()));
        } else {
            products = await Product.find({ isdelete: false }).sort(sortQuery);
        }

      
        const ratingsData = await Order.aggregate([
            { $unwind: "$items" }, 
            { $match: { "items.rating": { $ne: null } } },
            {
                $group: {
                    _id: "$items.productId",
                    avgRating: { $avg: "$items.rating" }
                }
            }
        ]);

        
        const ratingsMap = new Map(ratingsData.map(r => [r._id.toString(), r.avgRating.toFixed(1)]));

        // Add average rating to each product
        const productsWithAvgRating = products.map(product => ({
            ...product.toObject(),
            avgRating: ratingsMap.get(product._id.toString()) || "No ratings yet"
        }));

        const categories = await Category.find({ isListed: false });
        const latestProduct = await Product.find().sort({ createdAt: -1 }).limit(1);

        let cartItems = [];
        if (req.user) {
            const cart = await Cart.findOne({ userId: req.user._id });
            cartItems = cart ? cart.items : [];
        }

        res.render("user/home", {
            user: req.user,
            categories,
            product: productsWithAvgRating, 
            date: latestProduct,
            cartItems,
            session: req.session
        });
    } catch (error) {
        console.error("Error fetching homepage data:", error);
        res.status(500).send("Internal Server Error");
    }
};


export const shoppage = async (req, res) => {
    try {
        const { category, sort } = req.query;

        let sortQuery = {};
        if (sort === "price-asc") sortQuery = { price: 1 };
        if (sort === "price-desc") sortQuery = { price: -1 };

        let allProducts = [];

        if (category) {
            allProducts = await Product.aggregate([
                {
                    $lookup: {
                        from: "categories",
                        localField: "category",
                        foreignField: "_id",
                        as: "resultCategory"
                    }
                },
                {
                    $match: {
                        "resultCategory.name": { $regex: `^${category}`, $options: "i" }
                    }
                }
            ]);
        } else {
            allProducts = await Product.find({ isdelete: false }).sort(sortQuery);
        }

        // Case-insensitive sorting for names
        if (sort === "name-asc") {
            allProducts = allProducts.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        } else if (sort === "name-desc") {
            allProducts = allProducts.sort((a, b) => b.name.toLowerCase().localeCompare(a.name.toLowerCase()));
        }

        const categories = await Category.find({ isListed: false });
        const latestProduct = await Product.find().sort({ createdAt: -1 }).limit(1);

        let cartItems = [];
        if (req.user) {
            const cart = await Cart.findOne({ userId: req.user._id });
            cartItems = cart ? cart.items : [];
        }

        res.render("user/shop", {
            user: req.user,
            categories,
            product: allProducts, 
            date: latestProduct,
            cartItems,
            session: req.session
        });
    } catch (error) {
        console.error("Error: Shop page is not working", error);
        return res.status(500).send("Shop page is not working");
    }
};


export const productview = async (req, res) => {
    try {
        const productId = req.params.id;  
        
        // Find the product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send("Product not found");
        }

        // Aggregate average rating from orders
        const ratingData = await Order.aggregate([
            { $unwind: "$items" }, // Break down order items
            { $match: { "items.productId": product._id, "items.rating": { $ne: null } } }, // Exclude null ratings
            {
                $group: {
                    _id: "$items.productId",
                    avgRating: { $avg: "$items.rating" }
                }
            }
        ]);

        // Set average rating (if no ratings, default to null)
        const avgRating = ratingData.length > 0 ? ratingData[0].avgRating.toFixed(1) : null;

        // Fetch similar products from the same category
        const similarProducts = await Product.aggregate([
            {
                $lookup: {
                    from: "categories",
                    foreignField: "_id",
                    localField: "category",
                    as: "resultProducts"
                }
            },
            { $unwind: "$resultProducts" },
            {
                $match: {
                    "resultProducts._id": product.category
                }
            }
        ]);

        // Select 4 random similar products
        const randomNumbers = new Set();
        while (randomNumbers.size < 4) {
            const randomNum = Math.floor(Math.random() * similarProducts.length);
            randomNumbers.add(randomNum);
        }

        let simProducts = [];
        Array.from(randomNumbers).forEach(index => {
            simProducts.push(similarProducts[index]);
        });

        res.render("user/productview", { product, avgRating, simProducts });

    } catch (error) {
        console.error("Error fetching product:", error);
        return res.status(500).send("Internal server error");
    }
};



// export const getprofile = async (req, res) => {
//     console.log("Session user:", req.session.user);
//     console.log("Req user:", req.user); // Log req.user for debugging

//     try {
//         if (!req.user) {
//             return res.status(401).send("User not authenticated");
//         }

//         const user = await User.findById(req.user._id).select('fname lname email');

//         res.render('user/profile', { user });
//     } catch (error) {
//         console.error("Error fetching profile:", error);
//         return res.status(500).send("Profile could not be retrieved");
//     }
// };



// export const postprofile = async (req, res) => {
//     const { fname, lname, email, dob } = req.body;

//     try {
//         const user = await User.findById(req.user._id);

//         if (!user) {
//             return res.status(404).send('User not found');
//         }

//         // Update user details
//         user.fname = fname || user.fname;
//         user.lname = lname || user.lname;
//         user.email = email || user.email;
//         user.dob = dob ? new Date(dob) : user.dob;

//         // If a new profile image is uploaded
//         if (req.file) {
//             // If the current image is a manually uploaded file, delete it
//             if (user.profileImage && user.profileImage.startsWith('/uploads/profiles/')) {
//                 const oldImagePath = path.join('public', user.profileImage);
//                 fs.unlink(oldImagePath, (err) => {
//                     if (err) console.error(`Error deleting old image: ${err.message}`);
//                 });
//             }

//             // Update with the new image path
//             user.profileImage = `/uploads/profiles/${req.file.filename}`;
//         }

//         await user.save();
//         res.redirect('/user/profile');
//     } catch (error) {
//         console.error('Error updating profile:', error);
//         return res.status(500).send('Server error');
//     }
// };





export const getprofile = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.redirect("/user/profile")
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/user/login');
        }

        const order = await Order.findOne({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.render("user/profile", {
            user,
            order, 
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect("/user/home");
    }
};

export const postprofile = async (req, res) => {
    try {
        const { fname, lname, gender, dob } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/user/profile');
        }

      
        if (req.file) {

            if (user.profileImage) {
                const oldImagePath = path.join('public', user.profileImage); 
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath); 
                }
            }

            user.profileImage = `/uploads/profileImage/${req.file.filename}`;
        }

        // 🔹 Update Other Fields
        user.fname = fname || user.fname;
        user.lname = lname || user.lname;
        user.gender = gender || user.gender;

        if (dob && !isNaN(new Date(dob).getTime())) {
            user.dob = new Date(dob);
        }

        await user.save();
        req.flash('success', 'Profile updated successfully');
        res.redirect('/user/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        req.flash('error', 'Server error. Please try again.');
        res.redirect('/user/profile');
    }
};

export const validatepass = async (req, res) => {
    try {
        const { currentPassword } = req.body;
        console.log("Received password:", currentPassword); 

        if (!currentPassword) {
            return res.status(400).json({ valid: false, message: 'Current password is required' });
        }

        if (!req.user || !req.user._id) {
            return res.status(401).json({ valid: false, message: 'User not authenticated' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ valid: false, message: 'User not found' });
        }

        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ valid: false, message: 'Incorrect password' });
        }

        return res.json({ valid: true, message: 'Password is correct' });

    } catch (error) {
        console.error('Error validating password:', error);
        return res.status(500).json({ valid: false, message: 'Server error' });
    }
};
export const getaddress = async (req, res) => {
    try {
        const address = await Address.find({ userId: req.user._id });  
        console.log("here");
        
       
        res.render('user/address', { address, error: req.flash('error') });
    } catch (error) {
        console.error(error, "Address fetching error");
        res.status(500).send("Address not fetched");
    }
};
export const postaddress = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: "Unauthorized: Please log in" });
        }

        const { fullName, phone, streetAddress, city, state, pincode, addressType } = req.body;

        if (!fullName || !phone || !streetAddress || !city || !state || !pincode || !addressType) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const newAddress = new Address({
            userId: req.user._id,
            fullName,
            phone,
            streetAddress,
            city,
            state,
            pincode,
            addressType,
        });

        await newAddress.save();
        res.json({ success: true, message: "Address added successfully" });

    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).json({ success: false, message: "Failed to add address" });
    }
};



export const geteditaddress = async(req,res)=>{
    try {
        const AddressId= req.params.id;
        const address = await Address.findById(AddressId);
        if(!address){
            req.flash("error","Address not found");
            return res.redirect("/user/address")
        }
        res.render("user/edit-address",{address})
    } catch (error) {
        console.error("edit address error");
        return res.status(500).send("edit address is not working")
    }
}

export const posteditaddress = async(req,res)=>{
    try {
        const AddressId = req.params.id;
        const {fullName,phone,city,state,pincode,streetAddress,addressType}=req.body


        const updateaddress= await Address.findByIdAndUpdate(AddressId,
            {fullName,phone,city,state,pincode,streetAddress,addressType},
            {new:true}
        );
        if(!updateaddress){
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        res.redirect("/user/address")
    } catch (error) {
        console.error("edit address not work",err);
        return res.status(500).send("its not working")
    }
}


export const deleteaddress = async(req,res)=>{
    try {
        const addressId = req.params.id;
        const deletedAddress = await Address.findByIdAndDelete(addressId);

        if (!deletedAddress) {
            req.flash("error", "Address not found");
            return res.redirect("/user/address");
        }

        req.flash("success", "Address deleted successfully!");
        res.redirect("/user/address");
    } catch (error) {
        console.error("Error deleting address:", error);
        req.flash("error", "Failed to delete address.");
        res.redirect("/user/address");
    }
}
export const searchproduct = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.render("user/home", { 
                product: [], 
                session: req.session, 
                cartItems: [],
                date: [],
                categories: []
            }); 
        }

        const products = await Product.find({
            name: { $regex: `^${query}`, $options: "i" } 
        });
        console.log(products);
        console.log("search query:", query);

        

        res.render("user/home", { 
            product: products, 
            session: req.session, 
            cartItems: [], 
            date: [],
            categories: [] 
        });
    } catch (error) {
        console.error("Error searching products:", error);
        res.status(500).send("Internal Server Error");
    }
};



// user block check




export const checkSession = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.json({ sessionActive: false });
        }

        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.json({ sessionActive: false });
        }

        if (user.blocked) {
            req.session.destroy(); 
            return res.json({ sessionActive: false, message: "Your account has been blocked. Please contact support." });
        }

        res.json({ sessionActive: true });

    } catch (error) {
        console.error("Error checking session:", error);
        res.status(500).json({ sessionActive: false, message: "Server error" });
    }
};