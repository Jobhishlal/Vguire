import WalletTransaction from "../models/wallet.js";
import User from '../models/userSchema.js';
import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import flash from "express-flash";
import { nanoid } from "nanoid";
import mongoose from "mongoose";

export const walletget = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 5;

        
        const user = await User.findById(userId);

    
        const totalTransactions = await WalletTransaction.countDocuments({ userId });
        const totalPages = Math.ceil(totalTransactions / itemsPerPage);

      
        const transactions = await WalletTransaction.find({ userId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);

        
        const wallet = {
            balance: user.walletBalance,
            transactions
        };

        res.render("user/wallet", {
            wallet,
            user,
            currentPage: page,
            totalPages,
            itemsPerPage
        });

    } catch (error) {
        console.error("Error fetching wallet:", error);
        res.status(500).send("Server Error");
    }
};

export const addmoney = async (req, res) => {
    try {
        const { amount } = req.body;

        
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

       
        const options = {
            amount: amount * 100, 
            currency: "INR",
            receipt: `wallet_${Date.now()}`,
            
        };

        console.log(options);

        const order = await razorpay.orders.create(options);

        res.json({ success: true, order,  razorpayKey: process.env.RAZORPAY_KEY_ID }); // Send order ID to frontend
    } catch (error) {
        console.error("Wallet Error:", error);
        res.status(500).json({ success: false, message: "Failed to create order" });
    }
};


// export const verifymoney = async (req, res) => {
//     try {
//         console.log("Verifying Wallet Payment:", req.body);

//         const { 
//             razorpay_order_id, 
//             razorpay_payment_id, 
//             razorpay_signature, 
//             amount 
//         } = req.body;
        
//         const userId = req.user._id;
//         console.log("User ID:", userId);

//         if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount || !userId) {
//             return res.status(400).json({ success: false, message: "Missing required payment details" });
//         }

   
//         if (!mongoose.Types.ObjectId.isValid(userId)) {
//             return res.status(400).json({ success: false, message: "Invalid user ID" });
//         }
//         const userObjectId = new mongoose.Types.ObjectId(userId);

        
//         const walletAmount = amount;
       
//         const updatedUser = await User.findByIdAndUpdate(
//             userObjectId, 
//             { $inc: { walletBalance: walletAmount } },
//             { new: true }
//         );
//         if (!updatedUser) {
//             return res.status(404).json({ success: false, message: "User not found" });
//         }

//         console.log(` Wallet updated for User ID: ${userId}, Amount Added: ${walletAmount} INR`);

//         return res.status(200).json({ 
//             success: true, 
//             message: "Wallet Recharged Successfully",
//             walletBalance: updatedUser.walletBalance 
//         });

//     } catch (error) {
//         console.error(" Wallet Payment Verification Error:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };


export const verifymoney = async (req, res) => {
    try {
        console.log("Verifying Wallet Payment:", req.body);

        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            amount 
        } = req.body;
        
        const userId = req.user._id;
        console.log("User ID:", userId);

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount || !userId) {
            return res.status(400).json({ success: false, message: "Missing required payment details" });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Update wallet balance
        const updatedUser = await User.findByIdAndUpdate(
            userObjectId, 
            { $inc: { walletBalance: amount } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Store transaction history
        const transaction = new WalletTransaction({
            userId: userObjectId,
            amount,
            type: "Credit",
            description: `Added ₹${amount} to wallet via Razorpay`
        });

        await transaction.save(); // Save the transaction

        console.log(`Wallet updated for User ID: ${userId}, Amount Added: ₹${amount}`);

        return res.status(200).json({ 
            success: true, 
            message: "Wallet Recharged Successfully",
            walletBalance: updatedUser.walletBalance 
        });

    } catch (error) {
        console.error("Wallet Payment Verification Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};