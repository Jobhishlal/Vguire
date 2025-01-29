import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';    
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/userSchema.js'; 
import { error } from 'console';
import exp from 'constants';
import Category from '../models/category.js';
import Product from '../models/products.js'; 


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

export const loadSignup = (req, res) => {
    res.render('user/signup', { flashMessage: req.flash('msg') });
};




export const signup = async (req, res) => {
    const { fname, lname, email, password, cpassword } = req.body;
    console.log(req.body);

    const data = {
        fname: fname,
        lname: lname,
        email: email,
        password: password,
        cpassword: cpassword
    };

    req.session.details = data;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    if (password !== cpassword) {
        req.flash('msg', 'Passwords do not match');
        return res.render('user/signup', { flashMessage: req.flash('msg') }); // Render signup with the message
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('msg', 'User with this email already exists');
            return res.render('user/signup', { flashMessage: req.flash('msg') }); // Render signup with the message
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const otp = generateOtp();  
        const emailSent = await sendVerificationEmail(email, otp);
        console.log("Email sent: ", emailSent);

        if (!emailSent) {
            req.flash('msg', 'Failed to send verification email. Try again later.');
            return res.render('user/signup', { flashMessage: req.flash('msg') }); // Render signup with the message
        }

        req.session.otp = otp;
        req.session.email = email;
        req.flash('msg', 'OTP sent to your email. Please verify.');
        return res.redirect('/user/otp');  // Redirect to OTP page

    } catch (err) {
        console.error('Error in signup:', err);
        res.status(500).send('Server error');
    }
};

export const otprecieve = (req, res) => {
    const email = req.session.userEmail;  // Retrieve email from session
    res.render('user/otp', { userEmail: email , msg:req.flash('msg')});  // Pass email to the view
};



export const verifyOtp = async (req, res) => {
    const { otp } = req.body;
    const data = req.session.details;
    const email = data.email;
    const storedOtp = req.session.otp;
    const otpSentAt = req.session.otpSentAt;
    console.log(storedOtp)
    console.log(otpSentAt);
    

    if (!email || !otp) {
        req.flash('msg', 'Please enter both OTP and Email');
        return res.redirect('/user/otp');
    }

    try {
        // Check if OTP has expired (1 minute expiry)
        const otpExpiryTime = 1 * 60 * 1000; // OTP expires after 1 minute (in milliseconds)
        if (Date.now() - otpSentAt > otpExpiryTime) {
            req.flash('msg', 'OTP has expired. Please request a new OTP.');
            req.session.otp = null;  // Clear OTP
            return res.redirect('/user/otp');
        }

        // Check if OTP entered is correct
        if (parseInt(otp) !== storedOtp) {
            req.flash('msg', 'Invalid OTP');
            return res.redirect('/user/otp');
        }

        // OTP is correct, now store the user data in DB
        const hashedPassword = await bcrypt.hash(data.password, 10); // Hash password

        const newUser = new User({
            fname: data.fname,
            lname: data.lname,
            email: data.email,
            password: hashedPassword,
            otp: null,  
            verified: true,  
        });

        await newUser.save();  

        req.session.otp = null; 
        req.session.details = null;  

        req.flash('msg', 'User verified successfully. Redirecting to homepage...');
        return res.redirect('/user/home'); 

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).send('Server error');
    }
};




export const getLoginPage = (req, res) => {
    res.render('user/login', { error: '' })
};

// User Login Logic
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
            return res.render('user/login',{error:'User is blocked'})
          }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('user/login', { error: 'Invalid email or password' });
        }

        req.session.user = user; 
        res.redirect('/user/home')
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

export const forgot = async (req, res) => {
    res.render('user/forgot-password');
};

// Handle forgot password and send OTP

export const forgotpasswordhandler = async (req, res) => {
    const { email } = req.body;
    
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.render('user/forgot-password', { msg: "No account found with this email." });
        }

        const otpSentAt = req.session.otpSentAt || 0;  
        const otpExpiryTime = 1 * 60 * 1000/2;  // 

        // Check if OTP was sent within the last minute
        if (Date.now() - otpSentAt < otpExpiryTime) {
            const timeRemaining = Math.floor((otpExpiryTime - (Date.now() - otpSentAt)) / 1000);
            return res.render('user/forgot-password', { msg: `Please wait ${timeRemaining} seconds to resend OTP.` });
        }

        // OTP has expired or hasn't been sent yet, generate a new OTP
        const otp = Math.floor(100000 + Math.random() * 900000);  // 6-digit OTP
        req.session.otp = otp;  // Store OTP in session
        req.session.otpSentAt = Date.now();  // Store the timestamp when OTP was sent

        console.log("New OTP:", req.session.otp);

        // Send the OTP to user's email
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
        // Render OTP verification page
        res.render('user/verify-otp', { msg: "OTP sent to your email. Please verify." });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};

export const resendOtp = async (req, res) => {
    console.log('resend otpyil kayri');
    
    const email = req.session.email; // Retrieve the email from the session
    if (!email) {
        return res.redirect('/user/login'); // If no email in session, redirect to login
    }

    try {
        const otp = Math.floor(10000 + Math.random() * 900000); // Generate a 5-digit OTP
        req.session.otp = otp;
        req.session.otpSentAt = Date.now(); // Store the time the OTP was sent

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail address
                pass: process.env.EMAIL_PASS  // Your Gmail password or App password
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your new OTP to reset your password is: ${otp}`
        };

        await transporter.sendMail(mailOptions);
        
        // Send success response
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

        // Check if OTP is valid and not expired
        if (checkOtp != otp) {
            return res.render('user/verify-otp', { msg: "Invalid or expired OTP" });
        }

        // OTP is valid, allow user to reset password
        res.render('user/reset-password');  // Pass email to reset page

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

        // Hash the new password and save
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
        // Extract password from request body
        const { password } = req.body;
        console.log('Request body:', req.body);

        // Validate password
        if (!password || typeof password !== 'string') {
            console.error('Invalid password');
            return res.render('user/reset-password', { msg: "Password is required and must be a valid string" });
        }
 
        console.log('Password validation passed');

        // Get user email from session
        const email = req.session.user;
        console.log('Email from session:', email);

        // Find user by email
        const user = await User.findOne({ email });
        console.log('User found:', user);

        if (!user) {
            console.error('User not found');
            return res.render('user/reset-password', { msg: "User not found" });
        }

        console.log('Hashing password...');
        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        // Update user password with the hashed version
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







//dont change top code//

export const homepage = async (req, res) => {
    try {
       
       const categories = await Category.find(); 
       const product=await Product.find()
       const createdAt= await Product.find().sort({createdAt:-1}).limit(1)
       console.log(categories); 
       console.log('hiiii');
       
 
       if (!categories || categories.length === 0) {
          console.log("No categories found.");
          return res.status(404).send("No categories found");
       }
       if(!product||product.length===0){
        console.log("No product  found");
        return res.status(505).send("No Products found")
        
       }
 
         
 
    
       res.render('user/home', {
          user: req.user,  
          categories: categories ,
          product:product,
          date:createdAt

       });
    } catch (error) {
       
       console.error("Error fetching categories:", error);
       return res.status(500).send("Internal server error");
    }
 };
 
 export const shoppage =async(req,res)=>{
    try {
        console.log('enter');
        
        const category=req.query.category
        console.log(category);
        
        let allProducts
        if(category){
            allProducts=await Product.aggregate([
                {
                    $lookup:{
                        from:'categories',
                        localField:'category',
                        foreignField:'_id',
                        as:'resultCategory'
                    }
                },
                {
                    $match:{
                        'resultCategory.name':{
                            $regex:`^${category}`, 
                            $options:'i'
                        }
                    }
                }
            ])
        }else{
            allProducts=await Product.find()
        }
        
        

        res.render('user/shop',{
            allProducts:allProducts
        })
        
    } catch (error) {
        console.error('error:"product is not working',error);
        return res.status(500).send("its not working")
        
    }
 }

export const productview = async (req, res) => {
    try {
        const productId = req.params.id;  
        const product = await Product.findById(productId);  
        console.log(product);
        

        if (!product) {
            return res.status(404).send("Product not found");
        }

        res.render('user/productview', { product: product });
    } catch (error) {
        console.error("Error fetching product:", error);
        return res.status(500).send("Internal server error");
    }
};
