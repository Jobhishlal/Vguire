

import Cart from '../models/cart.js';
import Product from '../models/products.js';
import Address from '../models/address.js';
import Order from '../models/order.js';
import mongoose from 'mongoose';
import razorpay from "../config/razorpay.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import Coupon from "../models/couponSchema.js";
import userSchema from '../models/userSchema.js';
import { log } from 'console';

import User from '../models/userSchema.js'
import WalletTransaction from "../models/wallet.js";
import exp from 'constants';

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);







export const singlecheckout = async (req, res) => {
    console.log("poodo");
    
    try {
        const { productId, quantity, size } = req.body;
        const userId = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid product ID" });
        }
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized: Please log in" });
        }
        if (!quantity || isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({ success: false, message: "Invalid quantity" });
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const addresses = await Address.find({ userId });

        res.json({
            success: true,
            checkoutType: "single",
            items: [{ product, quantity, price: product.price, size }],
            addresses,
            totalAmount: product.price * parseInt(quantity),
            redirectUrl: "/user/checkout"
        });
        

    } catch (error) {
        console.error("Checkout Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const buyNowCartView = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.productId");

        if (!cart || cart.items.length === 0) {
            return res.redirect("/cart");
        }

        const addresses = await Address.find({ userId });
        const selectedAddressId = addresses.length > 0 ? addresses[0]._id.toString() : '';

        let totalAmount = cart.items.reduce((total, item) => {
            const product = item.productId;
            const price = (product.Offerprice && product.Offerprice > 0) ? product.Offerprice : product.price;
            return total + (price * item.quantity);
        }, 0);

        let discountAmount = 0;
        let appliedCoupon = null;

        if (req.session.appliedCoupon) {
            const coupon = await Coupon.findOne({ code: req.session.appliedCoupon });

            if (coupon) {
                discountAmount = Math.min(coupon.discountAmount, totalAmount); 
                appliedCoupon = coupon.code;
                totalAmount -= discountAmount;
            }
        }

        const availableCoupons = await Coupon.find({
            usedByUsers: { $ne: userId },  
            expirationDate: { $gte: new Date() },  
            startDate: { $lte: new Date() },  
            usageLimit: { $gt: 0 }, 
            minOrderAmount: { $lte: totalAmount }  
        });
        

        res.render("user/checkout", {
            items: cart.items.map(item => ({
                size: item.size,
                product: item.productId,
                quantity: item.quantity,
                price: (item.productId.Offerprice && item.productId.Offerprice > 0) ? item.productId.Offerprice : item.productId.price
            })),
            addresses,
            selectedAddressId,
            totalAmount,
            discountAmount,
            appliedCoupon,
            currentCheckoutUrl: "/user/checkout",
            checkoutType: "cart",
            flashMessage: req.session.flashMessage || null,
            availableCoupons
        });

        delete req.session.flashMessage;

    } catch (error) {
        console.error("Checkout Error:", error);
        res.status(500).send("Server Error");
    }
};


export const cartproduct = async (req, res) => {
    console.log("i am cart product");
    
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.productId");

        if (!cart || cart.items.length === 0) {
            return res.redirect("/user/cart");
        }

        const address = await Address.findOne({ userId });
        const totalAmount = cart.items.reduce((total, item) => total + (item.productId.Offerprice * item.quantity), 0);
        const coupon = await Coupon.findOne({
            expirationDate
        })
        

        res.render("user/checkout", {
            items: cart.items.map(item => ({
                size: item.size,
                product: item.productId,
                quantity: item.quantity,
                Offerprice: item.productId.Offerprice
            })),
            address,
            totalAmount,
            checkoutType: "cart" 
        });
    } catch (error) {
        console.error("Cart Checkout Error:", error);
        return res.status(500).send("Checkout Error");
    }
};




export const placeorder = async (req, res) => {
    try {
        console.log("Request Body:", req.body);

        let { addressId, items, paymentMethod = "COD" } = req.body;
        let checkoutType = req.body.checkoutType || "cart";

        const userId = req.user?._id;

        const cart = await Cart.findOne({ userId }).populate("items.productId");
        console.log("Cart Data:", cart);

        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).send("Invalid address selected. Please choose a valid address.");
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).send("No items found in the order.");
        }

        console.log("Valid items received:", items);

        const productIds = items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });

        if (!products || products.length === 0) {
            return res.status(400).send("Invalid products in order.");
        }

        let outOfStockItems = [];
        let updatedItems = [];

        for (let item of items) {
            const product = products.find(p => p._id.toString() === item.productId);
            if (!product) {
                console.error(`Product not found: ${item.productId}`);
                continue;
            }

            const sizeKey = `size${item.size.trim().replace(/^size/i, "").toUpperCase()}`;
            console.log("Looking for size key:", sizeKey);

            const sizeStock = product[sizeKey] !== undefined ? product[sizeKey] : 0;
            console.log(`Available Stock for ${product.name} (${sizeKey}):`, sizeStock);

            if (sizeStock < parseInt(item.quantity)) {
                outOfStockItems.push({
                    productName: product.name,
                    availableStock: sizeStock,
                    size: item.size
                });
                continue;
            }

            const updateFields = { totalStock: -parseInt(item.quantity) };

            if (sizeKey in product) {
                updateFields[sizeKey] = -parseInt(item.quantity);
            }

            const updatedProduct = await Product.findByIdAndUpdate(
                item.productId,
                { $inc: updateFields },
                { new: true }
            );

            console.log(`Updated stock for ${updatedProduct.name} - Size: ${item.size}`);

            updatedItems.push({
                productId: product._id,
                quantity: parseInt(item.quantity),
                size: item.size,
                price: parseInt(product.Offerprice || product.price),
                totalprice: parseInt((product.Offerprice || product.price) * item.quantity)
            });
        }

        if (updatedItems.length === 0) {
            console.error("No valid items available for order. Order not placed.");
            return res.status(400).send("All items are out of stock. Please update your cart.");
        }

        let totalAmount = updatedItems.reduce((sum, item) => sum + item.totalprice, 0);

       
        let discountAmount = 0;
        let appliedCoupon = null;
        let couponDetails = null; 
        
        if (req.session.appliedCoupon) {
            const couponCode = typeof req.session.appliedCoupon === "object"
                ? req.session.appliedCoupon.code
                : req.session.appliedCoupon;
        
            const coupon = await Coupon.findOne({ code: couponCode });
        
            if (coupon) {
                appliedCoupon = coupon._id; 
        
             
                if (coupon.discountType === "percentage") {
                    discountAmount = Math.floor((coupon.value / 100) * totalAmount); 
                } else {
                    discountAmount = coupon.value;
                }
        
                
                totalAmount = Math.max(0, totalAmount - discountAmount);
        
            
                // await Coupon.updateOne({ _id: appliedCoupon }, { $inc: { usageLimit: -1 } });
                await Coupon.updateOne(
                    { _id: appliedCoupon },
                    { $addToSet: { temporarilyUsedByUsers: userId } }
                );
        
                delete req.session.appliedCoupon; 

                couponDetails = {
                    code: coupon.code,
                    discountType: coupon.discountType,
                    value: coupon.value,
                    minOrderAmount: coupon.minOrderAmount
                };
            }
        }


        if (paymentMethod === "COD" && totalAmount > 1000) {
            return res.status(400).json({
                success: false,
                message: "Cash on Delivery is not available for orders above ₹1000. Please choose another payment method."
            });
        }
        

        console.log("Final Total Amount After Coupon:", totalAmount);

        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 5);

        const paymentStatus = paymentMethod === "COD" ? "Pending" : "Paid";

        const newOrder = new Order({
            userId,
            items: updatedItems,
            addressId,
            totalAmount,
            discountAmount, 
            appliedCoupon, 
            couponDetails,
            paymentMethod,
            deliveryDate,
            status: "Pending",
            paymentStatus,
            transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            trackingNumber: `TRK-${Math.random().toString(36).substr(2, 10).toUpperCase()}`
        });
        

        await newOrder.save();
        console.log("Order placed successfully:", newOrder);

        await Cart.deleteOne({ userId });
        console.log("Cart cleared successfully");
        if (appliedCoupon) {
            await Coupon.updateOne(
                { _id: appliedCoupon },
                { 
                    $addToSet: { usedByUsers: userId },
                    $pull: { temporarilyUsedByUsers: userId }
                }
            );
        }

        return res.redirect("/user/order-success");

    } catch (error) {
        console.error("Order Placement Error:", error);
        if (req.session.appliedCoupon) {
            await Coupon.updateOne(
                { code: req.session.appliedCoupon },
                { $pull: { temporarilyUsedByUsers: req.user?._id } }
            );
        }
        return res.status(500).send("Server Error");
    }
};


export const addaddress = async (req, res) => {
    try {
        const { fullName, phone, streetAddress, city, state, pincode, addressType, redirectUrl } = req.body;

       
        const errors = [];

        if (!fullName || fullName.trim().length < 3) errors.push("Full name must be at least 3 characters long.");
        if (!phone || !/^[1-9][0-9]{9}$/.test(phone)) errors.push("Enter a valid 10-digit phone number.");
        if (!streetAddress || streetAddress.trim().length < 5) errors.push("Street Address must be at least 5 characters.");
        if (!city || city.trim().length < 3) errors.push("City must be at least 3 characters.");
        if (!state || state.trim().length < 3) errors.push("State must be at least 3 characters.");
        if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) errors.push("Enter a valid 6-digit Pincode.");
        if (!addressType || !["Home", "Work", "Other"].includes(addressType)) errors.push("Invalid address type selected.");

        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

       
        const newAddress = new Address({ fullName, phone, streetAddress, city, state, pincode, addressType, userId: req.user._id });
        await newAddress.save();

        return res.json({ success: true, redirectUrl: redirectUrl || "/user/checkout/buy-now" });

    } catch (error) {
        console.error("Address Addition Error:", error);
        return res.status(500).json({ success: false, errors: ["Server error, please try again later."] });
    }
};

export const editaddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const { fullName, phone, streetAddress, city, state, pincode, addressType, productId, quantity, size, redirectUrl } = req.body;

        
        const errors = [];

        if (!fullName || fullName.trim().length < 3) errors.push("Full name must be at least 3 characters long.");
        if (!phone || !/^[1-9][0-9]{9}$/.test(phone)) errors.push("Enter a valid 10-digit phone number.");
        if (!streetAddress || streetAddress.trim().length < 5) errors.push("Street Address must be at least 5 characters.");
        if (!city || city.trim().length < 3) errors.push("City must be at least 3 characters.");
        if (!state || state.trim().length < 3) errors.push("State must be at least 3 characters.");
        if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) errors.push("Enter a valid 6-digit Pincode.");
        if (!addressType || !["Home", "Work", "Other"].includes(addressType)) errors.push("Invalid address type selected.");

        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

    
        const updatedAddress = await Address.findByIdAndUpdate(addressId, req.body, { new: true });

        if (!updatedAddress) {
            return res.status(404).json({ success: false, errors: ["Address not found"] });
        }

      
        if (productId && quantity && size) {
            return res.json({ success: true, redirectUrl: `/user/checkout/single?productId=${productId}&quantity=${quantity}&size=${size}` });
        } else {
            return res.json({ success: true, redirectUrl: redirectUrl || "/user/checkout" });
        }
    } catch (error) {
        console.error("Edit Address Error:", error);
        return res.status(500).json({ success: false, errors: ["Server error, please try again later."] });
    }
};


export const singleCheckoutView = async (req, res) => {
    console.log("hello");
    
    try {
        const { productId, size } = req.query;
        const userId = req.user._id;

        if (!productId || !size) {
            return res.redirect("/user/shop");
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Product not found");

        const addresses = await Address.find({ userId });
        const selectedAddressId = addresses.length > 0 ? addresses[0]._id.toString() : '';

        const quantity = req.session.checkoutQuantity || 1;
        console.log("quantity check", quantity);
        console.log("user choose address id", selectedAddressId);

        
        const totalAmount = product.Offerprice * quantity;
        const coupons = await Coupon.find({
            expirationDate: { $gte: new Date() },
            usageLimit: { $gt: 0 },
            minOrderAmount: { $lte: totalAmount }
        });
        console.log("coupon details",coupons);
        

       
        res.render("user/checkout", {
            items: [{ product, quantity, Offerprice: product.Offerprice, size }],
            addresses,
            selectedAddressId,
            totalAmount,
            currentCheckoutUrl: `/user/checkout/single?productId=${productId}&size=${size}`,
            checkoutType: true,
            coupons  
        });

    } catch (error) {
        console.error("Single Checkout Error:", error);
        res.status(500).send("Server Error");
    }
};


export const getcheckout = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        const addresses = await Address.find({ userId });

        if (!cart || cart.items.length === 0) {
            return res.redirect("/user/cart");
        }

        let totalAmount = 0;
        let outOfStockItems = [];

        // Process cart items and calculate total
        const updatedItems = cart.items.map(item => {
            const product = item.productId;
            if (!product) return null;

            const availableStock = product[item.size] || 0;
            if (availableStock < item.quantity) {
                outOfStockItems.push({ productName: product.name, availableStock, size: item.size });
            }

            // Ensure Offerprice is valid before using it
            const price = (product.Offerprice !== undefined && product.Offerprice > 0) 
                          ? product.Offerprice 
                          : (product.price || 0);
            
            // Calculate total amount
            totalAmount += price * item.quantity;
            console.log("cart total",totalAmount);

            console.log(`Product: ${product.name}, Price Used: ${price}, Quantity: ${item.quantity}, Running Total: ${totalAmount}`);

            return { 
                product, 
                quantity: item.quantity, 
                offerprice: product.Offerprice || 0, 
                price: product.price || 0, 
                size: item.size, 
                availableStock 
            };
        }).filter(item => item !== null);

        // If any item is out of stock, redirect to cart
        if (outOfStockItems.length > 0) {
            req.session.flashMessage = {
                type: "error",
                message: `Some items are out of stock: ${outOfStockItems.map(i => `${i.productName} (Size: ${i.size}) - Available: ${i.availableStock}`).join(", ")}`
            };
            return res.redirect("/user/checkout/buy-now-cart?");
        }

        const selectedAddressId = addresses.length > 0 ? addresses[0]._id.toString() : '';

        const coupon = await Coupon.find({
            expirationDate: { $gte: new Date() },
            usageLimit: { $gt: 0 },
            usedByUsers: { $ne: userId }
        });

        console.log("Final Checkout Total:", totalAmount);

        res.render("user/checkout", {
            items: updatedItems,
            addresses,
            selectedAddressId,
            totalAmount,
            coupon,
            currentCheckoutUrl: "/user/checkout",
            checkoutType: "cart",
            flashMessage: req.session.flashMessage || null, 
            breadcrumbs: res.locals.breadcrumbs
        });
     
        

        delete req.session.flashMessage;

    } catch (error) {
        console.error("Checkout Page Error:", error);
        res.status(500).send("Error loading checkout page");
    }
};


export const updateCheckoutQuantity = async (req, res) => {
    try {
        console.log("Request Body:", req.body);

        const { productId, size, quantity, redirectUrl } = req.body;
        const userId = req.user._id;
        const updatedQuantity = parseInt(quantity);

        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Product not found");

        const selectedSize = `size${size.trim().toUpperCase()}`;

        if (updatedQuantity > product[selectedSize]) {
            req.session.flashMessage = `Only ${product[selectedSize]} items available.`;
            return res.redirect(redirectUrl || "/user/checkout");
        }

        req.session.checkoutQuantity = updatedQuantity;
        console.log("Quantity updated. Redirecting to:", redirectUrl);

        return res.redirect(redirectUrl || "/user/checkout");

    } catch (error) {
        console.error("Update Checkout Quantity Error:", error);
        res.status(500).send("Server Error");
    }
};



export const getorder = async (req, res) => {
    try {
        const userId = req.user._id;

        const latestOrder = await Order.findOne({ userId })
            .populate("items.productId")
            .populate("addressId")
            .sort({ createdAt: -1 });

        if (!latestOrder) {
            return res.render("user/order", { orders: [] });
        }

        res.render("user/order", { orders: [latestOrder] }); 
    } catch (error) {
        console.error("Error fetching order:", error);
        return res.status(500).send("Order page could not be retrieved.");
    }
};

export const ordersucccess = async (req, res) => {
    try {
        const userId = req.user._id;

        const order = await Order.findOne({ userId }).sort({ createdAt: -1 });

        if (!order) {
            return res.redirect("/user/orders"); 
        }

        res.render("user/order-success", { userId, order, items: order.items }); 
    } catch (error) {
        console.error("Order Success Page Error:", error);
        res.status(500).send("Server Error");
    }
};



export const orderdetails = async (req, res) => {
    try {
        const userId = req.user._id;
        let { page = 1, limit = 5 } = req.query; 

        page = parseInt(page);
        limit = parseInt(limit);

     
        const totalOrders = await Order.countDocuments({ userId });

      
        const orders = await Order.find({ userId })
            .populate("items.productId")
            .populate("addressId")
            .sort({ createdAt: -1 }) 
            .skip((page - 1) * limit)
            .limit(limit);

        res.render("user/order-details", {
            orders,
            userId,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            breadcrumbs: res.locals.breadcrumbs
        });
    } catch (error) {
        console.error("Order Details Fetch Error:", error);
        res.status(500).send("Server Error");
    }
};

// export const orderview = async (req, res) => { 
//     try {
//         console.log("Received params:", req.params);

//         const userId = req.user._id;
//         const { orderId } = req.params;

//         if (!orderId) {
//             console.error("orderId is missing in req.params!");
//             return res.redirect("/user/order-details");
//         }

//         const order = await Order.findOne({ _id: orderId, userId })
//             .populate("items.productId")
//             .populate("addressId")
//             .populate("appliedCoupon"); // Populate the coupon details

//         if (!order) {
//             req.flash("error", "Order not found");
//             return res.redirect("/user/order-details");
//         }

//         let subtotal = 0;
//         let totalProductDiscount = 0;
        
//         order.items.forEach(item => {
//             let productPrice = item.productId?.price || 0;
//             let offerPrice = item.productId?.Offerprice ?? productPrice; 
        
//             let finalPrice = offerPrice; 
//             let discountPerItem = productPrice > offerPrice ? productPrice - offerPrice : 0;
//             let totalDiscountPerProduct = discountPerItem * item.quantity;
        
//             subtotal += finalPrice * item.quantity;
//             totalProductDiscount += totalDiscountPerProduct;
//         });
        
//         let couponDiscount = 0;
//         if (order.appliedCoupon) {
//             const coupon = order.appliedCoupon;
//             if (coupon.discountType === "flat") {
//                 couponDiscount = coupon.discountValue; 
//             } else if (coupon.discountType === "percentage") {
//                 couponDiscount = (subtotal * coupon.discountValue) / 100; 
//             }
//         }
        

//         console.log("Subtotal:", subtotal);
//         console.log("Total Product Discount:", totalProductDiscount);
//         console.log("Coupon Discount:", couponDiscount);
        
//         order.discountAmount = couponDiscount;
//         order.totalAmount = subtotal - couponDiscount;
        
//         console.log("Final Total Amount:", order.totalAmount);
//         ; 
//         console.log(order);
        
//         res.render("user/order-view", {
//             order,
//             orders: [order],
//             userId,
//             breadcrumbs: res.locals.breadcrumbs
//         });
//     } catch (error) {
//         console.error("Order find error:", error);
//         return res.redirect("/user/home");
//     }
// };


// export const ordercancel = async (req, res) => {
//     try {
//         const { orderId, productId, reason } = req.body;
//         let order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({ message: "Order not found" });
//         }

//         const productIndex = order.items.findIndex(item => item.productId.toString() === productId);
//         if (productIndex === -1) {
//             return res.status(404).json({ message: "Product not found in order" });
//         }

//         if (["Shipped", "Delivered"].includes(order.items[productIndex].status)) {
//             return res.status(400).json({ message: "This product cannot be cancelled as it is already shipped or delivered" });
//         }

//         const cancelledItem = order.items[productIndex];
//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ message: "Product not found in database" });
//         }

   
//         const cancelledItemPrice = product.isOfferActive && product.Offerprice ? product.Offerprice : product.price;
//         const cancelledItemTotal = cancelledItemPrice * cancelledItem.quantity;

       
//         let refundAmount = cancelledItemTotal;
//         if (order.appliedCoupon) {
//             const totalDiscount = order.totalAmount - order.items.reduce((sum, item) => 
//                 item.status !== "Cancelled" ? sum + item.totalprice : sum, 0);
//             const proportion = cancelledItemTotal / order.totalAmount;
//             const itemDiscount = totalDiscount * proportion;
//             refundAmount = cancelledItemTotal - itemDiscount;
//         }

       
//         order.items[productIndex].refundedAmount = refundAmount;

//         order.totalAmount -= refundAmount;
//         if (order.totalAmount < 0) order.totalAmount = 0;

    
//         order.refundedAmount = (order.refundedAmount || 0) + refundAmount;

//         order.items[productIndex].status = "Cancelled";
//         order.items[productIndex].cancelReason = reason;

//         const cancelledQuantity = parseInt(cancelledItem.quantity);
//         const sizeKey = `size${cancelledItem.size.replace(/^size/i, "").trim().toUpperCase()}`;
//         await Product.findByIdAndUpdate(productId, {
//             $inc: {
//                 totalStock: cancelledQuantity,
//                 [sizeKey]: cancelledQuantity
//             }
//         }, { new: true });

//         if (order.items.every(item => item.status === "Cancelled")) {
//             order.status = "Cancelled";
//             order.paymentStatus = "Refunded";
//             refundAmount = order.totalAmount;
//         }

//         await order.save();

      
//         let updatedWalletBalance = null;
//         if (order.paymentMethod === "UPI") {
//             const currentUser = await User.findById(req.user._id);
//             if (currentUser) {
//                 currentUser.walletBalance = (currentUser.walletBalance || 0) + refundAmount;
//                 await currentUser.save();
//                 updatedWalletBalance = currentUser.walletBalance;

//                 await WalletTransaction.create({
//                     userId: currentUser._id,
//                     amount: refundAmount,
//                     type: "Credit",
//                     description: `Refund for cancelled product in Order ${order._id}`
//                 });
//             }
//         }

//         res.json({
//             message: order.status === "Cancelled" ? "Full order cancelled successfully" : "Product cancelled successfully",
//             refundAmount,
//             refundedAmount: order.refundedAmount,
//             walletBalance: updatedWalletBalance
//         });

//     } catch (error) {
//         console.error("Cancel Product Error:", error);
//         res.status(500).json({ message: "Server Error", error: error.message });
//     }
// };


// const generateInvoice = (res, order) => {
//     const invoicesDir = path.join(__dirname, "../public/invoices");
//     if (!fs.existsSync(invoicesDir)) {
//         fs.mkdirSync(invoicesDir, { recursive: true });
//     }

//     const invoicePath = path.join(invoicesDir, `invoice-${order._id}.pdf`);
//     const stream = fs.createWriteStream(invoicePath);
//     const doc = new PDFDocument({ margin: 50 });

//     doc.pipe(stream);

//     // Title
//     doc.fontSize(20).text("Product Invoice-Aura-Men-Store", { align: "center" }).moveDown();

//     // Customer Details
//     doc.fontSize(12)
//         .text(`Customer Name: ${order.addressId?.fullName || 'N/A'}`)
//         .text(`Email: ${order.userId?.email || 'N/A'}`)
//         .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`)
//         .moveDown();

//     // Address Details
//     doc.text(`${order.addressId?.streetAddress || 'N/A'}`)
//         .text(`${order.addressId?.city || 'N/A'}`)
//         .text(`${order.addressId?.state || 'N/A'}`)
//         .text(`${order.addressId?.pincode || 'N/A'}`)
//         .text(`Phone: ${order.addressId?.phone || 'N/A'}`).moveDown();

//     // Delivery Date
//     doc.text(`Delivery Date: ${new Date(order.deliveryDate).toLocaleDateString()}`).moveDown();

//     // Table Header
//     doc.fontSize(14).text("Product Details", { underline: true }).moveDown();
//     doc.fontSize(12);
//     const tableTop = doc.y;
//     doc.text("Product", 50, tableTop, { width: 150, align: "left" });
//     doc.text("Status", 200, tableTop, { width: 100, align: "left" });
//     doc.text("Quantity", 300, tableTop, { width: 80, align: "right" });
//     doc.text("Size", 380, tableTop, { width: 80, align: "right" });
//     doc.text("Amount", 460, tableTop, { width: 80, align: "right" });
//     doc.moveDown();

//     // Table Rows
//     let subtotal = 0;
//     order.items.forEach((item) => {
//         let productPrice = Number(item.productId?.price) || 0;
//         let offerPrice = Number(item.productId?.Offerprice) || productPrice;
//         let totalPrice = item.quantity * offerPrice;

//         // Ensure totalPrice is a number before proceeding
//         if (typeof totalPrice === 'number') {
//             subtotal += totalPrice;

//             const yOffset = doc.y;
//             doc.text(`${item.productId?.name || 'N/A'}`, 50, yOffset, { width: 150, align: "left" });
//             doc.text(`${item.status || 'N/A'}`, 200, yOffset, { width: 100, align: "left" });
//             doc.text(`${item.quantity}`, 300, yOffset, { width: 80, align: "right" });
//             doc.text(`${item.size || 'N/A'}`, 380, yOffset, { width: 80, align: "right" });
//             doc.text(`₹${totalPrice.toFixed(2)}`, 460, yOffset, { width: 80, align: "right" });
//             doc.moveDown();
//         } else {
//             console.error(`Invalid totalPrice for item: ${item.productId?.name}`);
//         }
//     });

//     // Totals
//     doc.moveDown();
//     if (typeof subtotal === 'number') {
//         doc.fontSize(12)
//             .text(`Subtotal: ₹${subtotal.toFixed(2)}`, { align: "right" })
//             .text(`Total Product Discount: ${(order.totalProductDiscount || 0).toFixed(2)}`, { align: "right" })
//             .text(`Coupon Discount: ${(order.couponDiscount || 0).toFixed(2)}`, { align: "right" })
//             .text(`Final Total Amount: ${(order.totalAmount).toFixed(2)}`, { align: "right", bold: true });
//     } else {
//         console.error(`Invalid subtotal: ${subtotal}`);
//     }

    
//     doc.moveDown();
//     doc.fontSize(12).text(`Payment Status: ${order.paymentStatus || 'N/A'}`, { align: "left" });

//     // Footer
//     doc.moveDown();
//     doc.fontSize(10).text("Thanks for Shopping!", { align: "center" });
//     doc.text("Aura-Men Store", { align: "center" });
//     doc.text("1527 Fashion Ave", { align: "center" });
//     doc.text("Los Angeles", { align: "center" });
//     doc.text("CA 90015", { align: "center" });
//     doc.text("USA", { align: "center" });
//     doc.text("Auramen@gmail.com", { align: "center" });
//     doc.text("+1 (213) 555-7890", { align: "center" });

//     doc.end();

//     stream.on("finish", () => {
//         res.download(invoicePath);
//     });

//     stream.on("error", (err) => {
//         console.error("Invoice generation error:", err);
//         res.status(500).send("Failed to generate invoice");
//     });
// };

const generateInvoice = (res, order) => {
    const invoicesDir = path.join(__dirname, "../public/invoices");
    if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const invoicePath = path.join(invoicesDir, `invoice-${order._id}.pdf`);
    const stream = fs.createWriteStream(invoicePath);
    const doc = new PDFDocument({ margin: 50 });

    doc.pipe(stream);

    // Header with Design
    doc.fillColor('#333333')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text("VGUIRE", { align: "center" })
        .moveDown(0.5);

    doc.fillColor('#555555')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text("Product Invoice", { align: "center" })
        .moveDown(2);

    // Customer Details
    doc.fillColor('#000000')
        .fontSize(12)
       
        .text(`Email: ${order.userId?.email || 'N/A'}`)
        .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`)
        .text(`Customer Name: ${order.addressId?.fullName || 'N/A'}`)
        .moveDown();

    // Address Details
    doc.text(`Address:${order.addressId?.fullName || 'N/A'}`)
        .text(`${order.addressId?.streetAddress || 'N/A'}`)
        .text(`${order.addressId?.city || 'N/A'}`)
        .text(`${order.addressId?.state || 'N/A'}`)
        .text(`${order.addressId?.pincode || 'N/A'}`)
        .text(`Phone: ${order.addressId?.phone || 'N/A'}`)
        .moveDown();

    // Delivery Date in Green Color
    doc.fillColor('#008000') // Green color for delivery date
        .text(`Delivery Date: ${new Date(order.deliveryDate).toLocaleDateString()}`)
        .fillColor('#000000') // Reset to black
        .moveDown();

    // Product Details Table
    doc.fontSize(14)
        .fillColor('#0000FF') // Blue color for headings
        .font('Helvetica-Bold')
        .text("Product Details", { underline: true })
        .moveDown();

    const tableTop = doc.y;
    const columnPositions = [50, 200, 300, 380, 460];
    const columnWidths = [150, 100, 80, 80, 80];

    // Draw table headers
    doc.fontSize(12)
        .fillColor('#0000FF') 
        .font('Helvetica-Bold')
        .text("Product", columnPositions[0], tableTop, { width: columnWidths[0], align: "left" })
        .text("Status", columnPositions[1], tableTop, { width: columnWidths[1], align: "left" })
        .text("Quantity", columnPositions[2], tableTop, { width: columnWidths[2], align: "right" })
        .text("Size", columnPositions[3], tableTop, { width: columnWidths[3], align: "right" })
        .text("Amount", columnPositions[4], tableTop, { width: columnWidths[4], align: "right" });

    // Draw horizontal line under headers
    doc.moveTo(50, tableTop + 20).lineTo(540, tableTop + 20).stroke();

    // Table Rows
    let subtotal = 0;
    order.items.forEach((item) => {
        let productPrice = Number(item.productId?.price) || 0;
        let offerPrice = Number(item.productId?.Offerprice) || productPrice;
        let totalPrice = item.quantity * offerPrice;

        if (typeof totalPrice === 'number') {
            subtotal += totalPrice;

            const yOffset = doc.y + 10;
            doc.fontSize(12)
                .fillColor('#000000')
                .font('Helvetica')
                .text(`${item.productId?.name || 'N/A'}`, columnPositions[0], yOffset, { width: columnWidths[0], align: "left" })
                .text(`${item.status || 'N/A'}`, columnPositions[1], yOffset, { width: columnWidths[1], align: "left" })
                .text(`${item.quantity}`, columnPositions[2], yOffset, { width: columnWidths[2], align: "right" })
                .text(`${item.size || 'N/A'}`, columnPositions[3], yOffset, { width: columnWidths[3], align: "right" })
                .text(`${totalPrice.toFixed(2)}`, columnPositions[4], yOffset, { width: columnWidths[4], align: "right" });

            // Draw horizontal line after each row
            doc.moveTo(50, yOffset + 10).lineTo(540, yOffset + 10).stroke();
        } else {
            console.error(`Invalid totalPrice for item: ${item.productId?.name}`);
        }
    });

   // Totals
doc.moveDown();
if (typeof subtotal === 'number') {
    // Calculate coupon discount based on the coupon type
    let couponDiscount = 0;
    if (order.appliedCoupon && typeof order.appliedCoupon === 'object') {  
        if (order.appliedCoupon.discountType === 'percentage') {
            couponDiscount = (subtotal * order.appliedCoupon.value) / 100;
        } else if (order.appliedCoupon.discountType === 'flat') {
            couponDiscount = order.appliedCoupon.value;
        }
    }
    const currentY = doc.y;
    doc.fontSize(12)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text(`Subtotal: ${subtotal.toFixed(2)}`, 50, currentY + 10, { align: "left" })
        .text(`Total Product Discount: ${(order.totalProductDiscount || 0).toFixed(2)}`, { align: "left" })
        .text(`Coupon Discount: ${couponDiscount.toFixed(2)}`, { align: "left" });

   
        if (typeof order.refundedAmount === 'number' && !isNaN(order.refundedAmount)) {
            doc.fillColor('#008000')
                .font('Helvetica-Bold')
                .text(`Refund Amount: ${order.refundedAmount.toFixed(2)}`, { align: "left" });
        }
        
    console.log("Refund Amount:", order.refundAmount);


    doc.fillColor('#FF0000') 
        .text(`Final Total Amount: ${(order.totalAmount).toFixed(2)}`, { align: "left", bold: true });
} else {
    console.error(`Invalid subtotal: ${subtotal}`);
}


    
    doc.moveDown();
    doc.fontSize(12)
        .fillColor('#0000FF') 
        .font('Helvetica-Bold')
        .text(`Payment Status: ${order.paymentStatus || 'N/A'}`, { align: "left" });

   
    doc.moveDown();
    doc.fontSize(10)
        .fillColor('#555555')
        .font('Helvetica')
        .text("Thanks for Shopping!", { align: "left" })
        .text("Vguire sports Store", { align: "left" })
        .text("1527 Fashion Ave", { align: "left" })
        .text("Los Angeles", { align: "left" })
        .text("CA 90015", { align: "left" })
        .text("USA", { align: "left" })
        .text("Vguire@gmail.com", { align: "left" })
        .text("+1 (213) 555-7890", { align: "left" });

    doc.end();

    stream.on("finish", () => {
        res.download(invoicePath);
    });

    stream.on("error", (err) => {
        console.error("Invoice generation error:", err);
        res.status(500).send("Failed to generate invoice");
    });
};

export const createRAZO = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const options = {
            amount: order.totalAmount * 100, 
            currency: "INR",
            receipt: `order_${orderId}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

    
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.json({
            success: true,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            razorpayKey: process.env.RAZORPAY_KEY_ID
        });

        console.log(" Razorpay order created & stored in DB:", razorpayOrder.id);
       
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


export const verifyRazorpayPaymentorderview = async (req, res) => {
    try {
        console.log("🔹 Debugging process.env:");
        console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID);
        console.log("RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET); // Should not be undefined

        if (!process.env.RAZORPAY_KEY_SECRET) {
            throw new Error("RAZORPAY_KEY_SECRET is missing! Check your .env file.");
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET) 
            .update(body)
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            await Order.updateOne(
                { razorpayOrderId: razorpay_order_id },
                { $set: { paymentStatus: "Paid", razorpayPaymentId: razorpay_payment_id } }
            );

            return res.json({ success: true });
        } else {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        console.error("Payment verification error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


// export const orderview = async (req, res) => { 
//     try {
//         console.log("Received params:", req.params);

//         const userId = req.user._id;
//         const { orderId } = req.params;
//         const {invoice}=req.query;

//         if (!orderId) {
//             console.error("orderId is missing in req.params!");
//             return res.redirect("/user/order-details");
//         }

//         const order = await Order.findOne({ _id: orderId, userId })
//             .populate("items.productId")
//             .populate("addressId")
//             .populate("appliedCoupon")
//              .populate("userId")
//              console.log("applied coupon",order.appliedCoupon);
             

//         if (!order) {
//             req.flash("error", "Order not found");
//             return res.redirect("/user/order-details");
//         }

//         let subtotal = 0;
//         let totalProductDiscount = 0;
//         let validItems = order.items.filter(item => !item.returnApproved); 

//         validItems.forEach(item => {
//             let productPrice = item.productId?.price || 0;
//             let offerPrice = item.productId?.Offerprice ?? productPrice; 
        
//             let finalPrice = offerPrice; 
//             let discountPerItem = productPrice > offerPrice ? productPrice - offerPrice : 0;
//             let totalDiscountPerProduct = discountPerItem * item.quantity;
        
//             subtotal += finalPrice * item.quantity;
//             totalProductDiscount += totalDiscountPerProduct;
//         });

//         let couponDiscount = 0;
//         if (order.appliedCoupon && validItems.length > 0) { 
//             const coupon = order.appliedCoupon;
//             if (coupon.discountType === "flat") {
//                 couponDiscount = coupon.discountValue; 
//             } else if (coupon.discountType === "percentage") {
//                 couponDiscount = (subtotal * coupon.discountValue) / 100; 
//             }
//         }

//         console.log("Subtotal (Excluding Returns):", subtotal);
//         console.log("Total Product Discount:", totalProductDiscount);
//         console.log("Coupon Discount:", couponDiscount);
        
//         order.discountAmount = couponDiscount;
//         order.totalAmount = subtotal - couponDiscount; 
        
//         console.log("Final Total Amount:", order.totalAmount);
//         if (invoice === "true") {
//             return generateInvoice(res, order);
//         }
        
//         let showPaymentOption = order.paymentStatus === "Pending" && order.paymentMethod === "UPI";
//         res.render("user/order-view", {
//             order,
//             orders: [order],
//             userId,
//             breadcrumbs: res.locals.breadcrumbs,
//             showPaymentOption, 
//             razorpayKey: process.env.RAZORPAY_KEY
            
//         });
//         console.log("razor",razorpayKey);
        
//     } catch (error) {
//         console.error("Order find error:", error);
//         return res.redirect("/user/home");
//     }
// };

export const orderview = async (req, res) => {

    console.log("hello i am");
    
    try {
        console.log("Received params:", req.params);



        const userId = req.user._id;
        const { orderId } = req.params;
        const { invoice } = req.query;

        if (!orderId) {
            console.error("orderId is missing in req.params!");
            return res.redirect("/user/order-details");
        }

        const order = await Order.findOne({ _id: orderId, userId })
            .populate("items.productId")
            .populate("addressId")
            .populate("appliedCoupon")
            .populate("userId");

        console.log("applied coupon", order.appliedCoupon);

        if (!order) {
            req.flash("error", "Order not found");
            return res.redirect("/user/order-details");
        }

        let subtotal = 0;
        let totalProductDiscount = 0;
        let validItems = order.items.filter(item => !item.returnApproved);

        validItems.forEach(item => {
            let productPrice = item.productId?.price || 0;
            let offerPrice = item.productId?.Offerprice ?? productPrice;

            let finalPrice = offerPrice;
            let discountPerItem = productPrice > offerPrice ? productPrice - offerPrice : 0;
            let totalDiscountPerProduct = discountPerItem * item.quantity;

            subtotal += finalPrice * item.quantity;
            totalProductDiscount += totalDiscountPerProduct;
        });

        let couponDiscount = 0;
        if (order.appliedCoupon && validItems.length > 0) {
            const coupon = order.appliedCoupon;
            if (coupon.discountType === "flat") {
                couponDiscount = coupon.discountValue;
            } else if (coupon.discountType === "percentage") {
                couponDiscount = (subtotal * coupon.discountValue) / 100;
            }
        }

        console.log("Subtotal (Excluding Returns):", subtotal);
        console.log("Total Product Discount:", totalProductDiscount);
        console.log("Coupon Discount:", couponDiscount);

        order.discountAmount = couponDiscount;
        order.totalAmount = subtotal - couponDiscount;

        console.log("Final Total Amount:", order.totalAmount);
        if (invoice === "true") {
            return generateInvoice(res, order);
        }

        let showPaymentOption = order.paymentStatus === "Pending" && order.paymentMethod === "UPI";
        console.log("Razorpay Key from env:", process.env.RAZORPAY_KEY_SECRET);

        res.render("user/order-view", {
            order,
            orders: [order],
            userId,
            breadcrumbs: res.locals.breadcrumbs,
            showPaymentOption,
            razorpayKey: process.env.RAZORPAY_KEY
        });

    } catch (error) {
        console.error("Order find error:", error);
        return res.redirect("/user/home");
    }
};


export const ordercancel = async (req, res) => {
    try {
        const { orderId, productId, reason } = req.body;
        let order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const productIndex = order.items.findIndex(item => item.productId.toString() === productId);
        if (productIndex === -1) {
            return res.status(404).json({ message: "Product not found in order" });
        }

        if (["Shipped", "Delivered"].includes(order.items[productIndex].status)) {
            return res.status(400).json({ message: "This product cannot be cancelled as it is already shipped or delivered" });
        }

        const cancelledItem = order.items[productIndex];
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found in database" });
        }

       
        const cancelledItemPrice = cancelledItem.price;
        const cancelledItemTotal = cancelledItem.totalprice;

       
        let refundAmount = cancelledItemTotal;
        let proportionalDiscount = 0;
        
        if (order.appliedCoupon) {
     
            const originalOrderTotal = order.items.reduce((sum, item) => sum + item.totalprice, 0);
            
           
            const totalDiscount = originalOrderTotal - order.totalAmount - (order.refundedAmount || 0);
    
            proportionalDiscount = (cancelledItemTotal / originalOrderTotal) * totalDiscount;
        
            refundAmount = cancelledItemTotal - proportionalDiscount;
        }

      
        order.items[productIndex].refundedAmount = refundAmount;

    
        const previousTotal = order.totalAmount;
        order.totalAmount = previousTotal - refundAmount;
        if (order.totalAmount < 0) order.totalAmount = 0;

       
        order.refundedAmount = (order.refundedAmount || 0) + refundAmount;

       
        order.items[productIndex].status = "Cancelled";
        order.items[productIndex].cancelReason = reason;

        // Return item to inventory
        const cancelledQuantity = parseInt(cancelledItem.quantity);
        const sizeKey = `size${cancelledItem.size.replace(/^size/i, "").trim().toUpperCase()}`;
        await Product.findByIdAndUpdate(productId, {
            $inc: {
                totalStock: cancelledQuantity,
                [sizeKey]: cancelledQuantity
            }
        }, { new: true });

        // If all items are cancelled, mark the entire order as cancelled
        if (order.items.every(item => item.status === "Cancelled")) {
            order.status = "Cancelled";
            order.paymentStatus = "Refunded";
        }

        await order.save();

        // Handle refund to wallet if payment was by UPI
        let updatedWalletBalance = null;
        if (order.paymentMethod === "UPI") {
            const currentUser = await User.findById(req.user._id);
            if (currentUser) {
                currentUser.walletBalance = (currentUser.walletBalance || 0) + refundAmount;
                await currentUser.save();
                updatedWalletBalance = currentUser.walletBalance;

                await WalletTransaction.create({
                    userId: currentUser._id,
                    amount: refundAmount,
                    type: "Credit",
                    description: `Refund for cancelled product in Order ${order._id}`
                });
            }
        }

        res.json({
            message: order.status === "Cancelled" ? "Full order cancelled successfully" : "Product cancelled successfully",
            refundAmount,
            refundedAmount: order.refundedAmount,
            remainingOrderAmount: order.totalAmount,
            appliedDiscount: proportionalDiscount,
            walletBalance: updatedWalletBalance
        });

    } catch (error) {
        console.error("Cancel Product Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};  

export const ratingadd = async (req, res) => {
    try {
        console.log(" Received request body:", req.body);  

        const { orderId, productId, rating } = req.body;
        const userId = req.user ? req.user._id : null;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized request" });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Invalid rating value!" });
        }

        console.log(`Checking order: ${orderId}, user: ${userId}, product: ${productId}`);

        const order = await Order.findOne({ _id: orderId, userId, "items.productId": productId });

        if (!order) {
            console.log("Order not found or not delivered.");
            return res.status(404).json({ success: false, message: "Order not found or not delivered!" });
        }

        order.items.forEach(item => {
            if (item.productId.toString() === productId) {
                item.rating = rating;
            }
        });

        await order.save();

     
        const ratedOrders = await Order.find({ "items.productId": productId, "items.rating": { $ne: null } });
        const totalRatings = ratedOrders.flatMap(order =>
            order.items.filter(i => i.productId.toString() === productId && i.rating)
        );
        const averageRating = totalRatings.reduce((sum, i) => sum + i.rating, 0) / totalRatings.length;

        await Product.findByIdAndUpdate(productId, { $set: { rating: averageRating.toFixed(1) } });

        res.json({ success: true, message: "Rating submitted successfully!" });
    } catch (error) {
        console.error(" Rating Error:", error);
        res.status(500).json({ success: false, message: "Server error. Try again!" });
    }
};

export const createRazorpayOrder = async (req, res) => {
    console.log("i am razo");
    
    try {
        const { amount, addressId, items, couponDiscount = 0 } = req.body;
        const userId = req.user?._id;
       console.log(req.body);
       console.log("userId getil kitty",userId);
      
       
       console.log("itemsget",items);
       
       
        if (!amount || !addressId || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid order details" });
        }

        const finalAmount = amount - couponDiscount;
        if (finalAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid final amount after discount" });
        }

        const razorpayOrder = await razorpay.orders.create({
            amount: finalAmount * 100, 
            currency: "INR",
            receipt: `order_rcpt_${Date.now()}`
        });

        res.json({
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            razorpayKey: process.env.RAZORPAY_KEY_ID,
            discountApplied: couponDiscount,
            userId 
        });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ error: "Failed to create Razorpay order." });
    }
};


// export const verifyPayment = async (req, res) => {
//     try {
//         console.log("Received Payment Verification Request:", req.body);

//         const { 
//             razorpay_order_id, 
//             razorpay_payment_id, 
//             razorpay_signature, 
//             items, 
//             addressId, 
//             totalAmount: initialTotalAmount, 
//             couponCode = 0,
//             userId 
//         } = req.body;

//         let totalAmount = initialTotalAmount; 
//         const extractedUserId = req.user?._id?.toString() || userId;
//         console.log("Final User ID:", extractedUserId);

//         if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !extractedUserId || !items || !addressId || !totalAmount) {
//             return res.status(400).json({ success: false, message: "Missing required payment details" });
//         }
//         let discountAmount = 0;
//         let appliedCoupon = null;
//         let couponDetails = null; 

//         if (req.session?.appliedCoupon) {
//         const appliedCouponCode = typeof req.session.appliedCoupon === "object"
//         ? req.session.appliedCoupon.code
//         : req.session.appliedCoupon;

//     const coupon = await Coupon.findOne({ code: appliedCouponCode });

//     if (coupon) {
//         appliedCoupon = coupon._id;
//         console.log("Applied Coupon ID:", appliedCoupon);

//         discountAmount = coupon.discountType === "percentage" 
//             ? Math.floor((coupon.value / 100) * totalAmount) 
//             : coupon.value;

//         totalAmount = Math.max(0, totalAmount - discountAmount);

//         await Coupon.updateOne({ _id: appliedCoupon }, { $inc: { usageLimit: -1 } });

//         delete req.session.appliedCoupon;

//         couponDetails = {
//             code: coupon.code,
//             discountType: coupon.discountType,
//             value: coupon.value,
//             minOrderAmount: coupon.minOrderAmount
//         };
//     }
//        }

//         console.log("Total Amount after applying coupon:", totalAmount);
//         console.log("Discount Amount:", discountAmount);
        
//         const productIds = items.map(item => item.productId);
//         const products = await Product.find({ _id: { $in: productIds } });

//         if (!products || products.length === 0) {
//             return res.status(400).json({ success: false, message: "Invalid products in order" });
//         }

//         console.log("Products found:", products);
//         const updatedItems = [];
        
//         for (let item of items) {
//             const product = products.find(p => p._id.toString() === item.productId);
//             if (!product) continue;
        
//             const sizeKey = `size${item.size.replace(/^size/i, "").trim().toUpperCase()}`;
//             const sizeStock = product[sizeKey] || 0; 
        
//             if (sizeStock < parseInt(item.quantity)) continue;
        
//             let updateFields = { totalStock: -parseInt(item.quantity) };
//             if (product[sizeKey] !== undefined) {
//                 updateFields[sizeKey] = -parseInt(item.quantity);
//             }
        
//             await Product.findByIdAndUpdate(item.productId, { $inc: updateFields }, { new: true });
        
//             const itemPrice = product.Offerprice > 0 ? product.Offerprice : product.price;
//             const totalPrice = itemPrice * item.quantity;
        
//             updatedItems.push({
//                 productId: product._id,
//                 size: item.size,
//                 quantity: parseInt(item.quantity),
//                 price: itemPrice,
//                 totalprice: totalPrice
//             });
//         }
        
//         console.log("Updated Order Items:", updatedItems);
        
//         if (updatedItems.length === 0) {
//             return res.status(400).json({ success: false, message: "All items are out of stock" });
//         }
        
//         const estimatedDeliveryDate = new Date();
//         estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5);

//         // Ensure correct total amount storage
//         console.log("Final Stored Total Amount (Before Saving):", typeof totalAmount, totalAmount);

//         const newOrder = new Order({
//             userId: extractedUserId,
//             items: updatedItems,
//             addressId,
//             totalAmount: parseFloat(totalAmount) + discountAmount,
//             totalPrice: totalAmount, 
//             couponCode, 
//             paymentId: razorpay_payment_id,
//             paymentStatus: "Paid",
//             orderStatus: "Processing",
//             couponDiscount: discountAmount,
//             appliedCoupon,
//             paymentMethod: "UPI",
//             deliveryDate: estimatedDeliveryDate,
//             couponDetails
//         });
        
//         await newOrder.save();
        
//         console.log("Order placed successfully:", newOrder);
//         await Cart.deleteOne({ userId });
//         console.log("Cart cleared successfully");

        
//         return res.status(200).json({ 
//             success: true, 
//             message: "Payment Verified & Order Placed", 
//             order: newOrder 
//         });
        
//     } catch (error) {
//         console.error("Payment Verification Error:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };

export const verifyPayment = async (req, res) => {
    try {
        console.log("Received Payment Verification Request:", req.body);

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            items,
            addressId,
            totalAmount: initialTotalAmount,
            couponCode = 0,
            userId,
            paymentStatus
        } = req.body;

        let totalAmount = initialTotalAmount;
        const extractedUserId = req.user?._id?.toString() || userId;

        if (!razorpay_order_id || !addressId || !items || !totalAmount || !extractedUserId) {
            return res.status(400).json({ success: false, message: "Missing required payment details" });
        }

        let discountAmount = 0;
        let appliedCoupon = null;
        let couponDetails = null;

        if (req.session?.appliedCoupon) {
            const appliedCouponCode = typeof req.session.appliedCoupon === "object"
                ? req.session.appliedCoupon.code
                : req.session.appliedCoupon;

            const coupon = await Coupon.findOne({ code: appliedCouponCode });

            if (coupon) {
                appliedCoupon = coupon._id;

                discountAmount = coupon.discountType === "percentage"
                    ? Math.floor((coupon.value / 100) * totalAmount)
                    : coupon.value;

                totalAmount = Math.max(0, totalAmount - discountAmount);

                await Coupon.updateOne({ _id: appliedCoupon }, { $inc: { usageLimit: -1 } });

                delete req.session.appliedCoupon;

                couponDetails = {
                    code: coupon.code,
                    discountType: coupon.discountType,
                    value: coupon.value,
                    minOrderAmount: coupon.minOrderAmount
                };
            }
        }

        console.log("Total Amount after applying coupon:", totalAmount);
        console.log("Discount Amount:", discountAmount);

        const productIds = items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });

        if (!products || products.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid products in order" });
        }

        const updatedItems = [];

        for (let item of items) {
            const product = products.find(p => p._id.toString() === item.productId);
            if (!product) continue;

            const sizeKey = `size${item.size.replace(/^size/i, "").trim().toUpperCase()}`;
            const sizeStock = product[sizeKey] || 0;

            if (sizeStock < parseInt(item.quantity)) continue;

            let updateFields = { totalStock: -parseInt(item.quantity) };
            if (product[sizeKey] !== undefined) {
                updateFields[sizeKey] = -parseInt(item.quantity);
            }

            await Product.findByIdAndUpdate(item.productId, { $inc: updateFields }, { new: true });

            const itemPrice = product.Offerprice > 0 ? product.Offerprice : product.price;
            const totalPrice = itemPrice * item.quantity;

            updatedItems.push({
                productId: product._id,
                size: item.size,
                quantity: parseInt(item.quantity),
                price: itemPrice,
                totalprice: totalPrice
            });
        }

        if (updatedItems.length === 0) {
            return res.status(400).json({ success: false, message: "All items are out of stock" });
        }

        const estimatedDeliveryDate = new Date();
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5);

        // Ensure correct total amount storage
        console.log("Final Stored Total Amount (Before Saving):", typeof totalAmount, totalAmount);

        const newOrder = new Order({
            userId: extractedUserId,
            items: updatedItems,
            addressId,
            totalAmount: parseFloat(totalAmount) + discountAmount,
            totalPrice: totalAmount,
            couponCode,
            paymentId: razorpay_payment_id || null,
            paymentStatus: paymentStatus === "Pending" ? "Pending" : "Paid",
            orderStatus: paymentStatus === "Pending" ? "Pending" : "Processing",
            couponDiscount: discountAmount,
            appliedCoupon,
            paymentMethod: "UPI",
            deliveryDate: estimatedDeliveryDate,
            couponDetails
        });

        await newOrder.save();

        console.log("Order placed successfully:", newOrder);
        await Cart.deleteOne({ userId });
        console.log("Cart cleared successfully");

        return res.status(200).json({
            success: true,
            message: "Payment Verified & Order Placed",
            order: newOrder
        });

    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};






export const couponapplied = async (req, res) => {
    try {
        const { couponcode, totalAmount } = req.body;
        const userId = req.user?.id || req.session?.userId;

        if (req.session.appliedCoupon) {
            return res.status(400).json({ 
                success: false, 
                type: "alreadyApplied", 
                message: "You have already applied a coupon for this order. You cannot apply another one." 
            });
        }

        const coupon = await Coupon.findOne({ code: couponcode });

        if (!coupon) {
            return res.status(400).json({ success: false, message: "Invalid coupon code" });
        }
``
        if (new Date() > new Date(coupon.expirationDate)) {
            return res.status(400).json({ success: false, type: "expired", message: "Coupon expired" });
        }

        if (coupon.usedByUsers.includes(userId)) {
            return res.status(400).json({ success: false, type: "alreadyUsed", message: "You have already used this coupon." });
        }

        if (coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, type: "limitExceeded", message: "Usage limit exceeded." });
        }

        if (totalAmount < coupon.minOrderAmount) {
            return res.status(400).json({ success: false, type: "minOrderAmount", message: `Minimum order amount required: ₹${coupon.minOrderAmount}` });
        }

        let discountAmount = coupon.discountType === "percentage" 
            ? (totalAmount * coupon.value) / 100 
            : coupon.value;

        discountAmount = Math.min(discountAmount, totalAmount);
        const finalAmount = totalAmount - discountAmount;

        
        // await Coupon.findOneAndUpdate(
        //     { code: couponcode },
        //     { $addToSet: { usedByUsers: userId } }
        // );
        
        await Coupon.findOneAndUpdate(
            { code: couponcode },
            { $addToSet: { temporarilyUsedByUsers: userId } }
        );

       
        req.session.appliedCoupon = couponcode;
        req.session.discountAmount = discountAmount;


        return res.json({
            success: true,
            discountAmount,
            finalAmount,
            couponcode,
            message: "Coupon applied successfully",
        });
    } catch (error) {
        console.error("Coupon error:", error);
        res.status(500).json({ success: false, message: "Server error! Try again later." });
    }
};
export const removecoupon = async (req, res) => {
    try {
     

        if (!req.session) {
            return res.status(500).json({ success: false, message: "Session not initialized" });
        }

        if (!req.session.appliedCoupon) {
            return res.status(400).json({ success: false, message: "No coupon applied" });
        }

        const removedCoupon = req.session.appliedCoupon;
        const userId = req.user?.id || req.session?.userId;

  
        delete req.session.appliedCoupon;
        delete req.session.discountAmount;

       
        await Coupon.findOneAndUpdate(
            { code: removedCoupon },
            { $pull: { usedByUsers: userId } } 
        );

       

        return res.json({ success: true, message: "Coupon removed successfully", removedCoupon });

    } catch (error) {
        console.error("Error in removecoupon:", error);
        return res.status(500).json({ success: false, message: "Server error! Try again later." });
    }
};


export const totalordercancel = async (req, res) => {
    try {
        const { orderId, reason } = req.body;

        // Fetch order details
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if order is already shipped or delivered
        if (["Shipped", "Delivered"].includes(order.status)) {
            return res.status(400).json({ message: "Order cannot be cancelled as it is already shipped or delivered" });
        }

       
        for (const item of order.items) {
            item.status = "Cancelled";
            item.cancelReason = reason;

            const product = await Product.findById(item.productId);
            if (product) {
                const cancelledQuantity = parseInt(item.quantity);
                const sizeKey = `size${item.size.replace(/^size/i, "").trim().toUpperCase()}`;

                await Product.findByIdAndUpdate(item.productId, {
                    $inc: {
                        totalStock: cancelledQuantity,
                        [sizeKey]: cancelledQuantity
                    }
                }, { new: true });
            }
        }

     
        order.status = "Cancelled";
        order.paymentStatus = "Refunded";

     
        let refundAmount = order.totalAmount;

        if (order.paymentMethod === "UPI") {
            const user = await User.findById(order.userId);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + refundAmount;
                await user.save();

                await WalletTransaction.create({
                    userId: user._id,
                    amount: refundAmount,
                    type: "Credit",
                    description: `Refund for cancelled Order ${order._id}`
                });
            }
        }

   
        await order.save();

        res.json({ message: "Order cancelled successfully", refundAmount });

    } catch (error) {
        console.error("Full Order Cancel Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


export const returnsingle = async (req, res) => {
    try {
        const { orderId, productId, reason } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Find product in the order
        const productIndex = order.items.findIndex(item => item.productId.toString() === productId);
        if (productIndex === -1) {
            return res.status(404).json({ message: "Product not found in order" });
        }

        const productItem = order.items[productIndex];

        if (productItem.status !== "Delivered") {
            return res.status(400).json({ message: "Only delivered products can be returned" });
        }

        // Prevent duplicate return requests for the same product
        if (productItem.returnStatus === "Requested") {
            return res.status(400).json({ message: "A return request for this product is already pending approval." });
        }

        if (productItem.returnStatus === "Approved" || productItem.returnStatus === "Returned") {
            return res.status(400).json({ message: "This product has already been returned." });
        }

        // Mark product as return requested
        productItem.returnRequested = true;
        productItem.returnRequestDate = new Date();
        productItem.returnReason = reason;
        productItem.returnStatus = "Requested"; // Waiting for admin approval

        await order.save();

        res.json({
            success: true,
            message: "Return request submitted. Admin approval pending.",
            requestedProduct: {
                productId,
                returnStatus: productItem.returnStatus,
                reason: productItem.returnReason
            }
        });

    } catch (error) {
        console.error("Product Return Request Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


export const returnentireorder = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.status !== "Delivered") {
            return res.status(400).json({ message: "Only delivered orders can be returned" });
        }

        order.returnRequested = true;
        order.returnRequestDate = new Date();
        order.returnReason = reason;  

        order.items.forEach(item => {
            item.returnRequested = true;
            item.returnRequestDate = new Date();
            item.returnStatus = "Requested";
            item.returnReason = reason;  
        });

        await order.save();

        res.json({ success: true, message: "Return request submitted for entire order. Admin approval pending.", returnRequested: true });
    } catch (error) {
        console.error("Order Return Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};



export const placeorderwallet = async (req,res)=>{
    try {
        let {addressId,items}= req.body;
        const userId= req.user?.id;
        const user = await User.findById(userId) 
        if(!User){
            return res.status(500).json({success:false,message:"Userr not found"})
        }
        if(!mongoose.Types.ObjectId.isValid(addressId)){
            return res.statu(500).json({success:false,message:"address is not get"})
        }
        if(!items||!Array.isArray(items)||items.length===0){
            return res.status(5000).json({success:false,message:"itsm not get properly"})
        }
        const cart = await Cart.findOne({userId}).populate("items.productId");
        const productIds = items.map(item=>item.productId);
        const products=await Product.find({_id:{$in:productIds}})
        let updatedItems=[];
        let totalAmount=0;
        let outOfStockItems=[];

        for(let item of items){
            const product =  products.find(p=>p._id.toString()===item.productId)
            if(!product)continue;
            const sizeKey=`size${item.size.trim().replace(/^size/i, "").toUpperCase()}`;
            const sizeStock = product[sizeKey] !== undefined ? product[sizeKey] : 0;
            if(sizeStock<parseInt(item.quantity)){
                outOfStockItems.push({productName:product.name,availableStock:sizeStock,size:item.size})
                continue;
            }
            const updateFields={totalStock:-parseInt(item.quantity)}
            if (sizeKey in product) updateFields[sizeKey] = -parseInt(item.quantity);
            await Product.findByIdAndUpdate(item.productId, { $inc: updateFields }, { new: true });

            let itemPrice=parseInt(product.Offerprice||product.price)
            updatedItems.push({
                productId: product._id,
                quantity: parseInt(item.quantity),
                size: item.size,
                price: itemPrice,
                totalprice: itemPrice * item.quantity
            });
            totalAmount += itemPrice * item.quantity;
        }
        
        if(updatedItems.length===0){
            return res.status(400).json({success:false,message:"all items are out of stock"})
        }
        // let discountAmount=0;
        // let appliedCoupon=null;
      
        // if(req.session.appliedCoupon){
        //     const couponCode=typeof req.session.appliedCoupon ==="object"
        //     ?req.session.appliedCoupon.code:req.session.appliedCoupon

        //     const coupon = await Coupon .findOne({code:couponCode})
        //     if(coupon){
        //         appliedCoupon=coupon._id;
        //         if(coupon.discountType==="percentage"){
        //             discountAmount.Math.floor((coupon.value/100)*totalAmount)
        //         }else{
        //             discountAmount=coupon.value;
        //         }
        //         totalAmount=Math.max(0,totalAmount-discountAmount);
        //         await Coupon.updateOne({ _id: appliedCoupon }, { $inc: { usageLimit: -1 } });

        //         delete req.session.appliedCoupon;
        //     }
           
        // }



        let discountAmount = 0;
let appliedCoupon = null;
let couponDetails = null; 

if (req.session.appliedCoupon) {
    const couponCode = typeof req.session.appliedCoupon === "object"
        ? req.session.appliedCoupon.code
        : req.session.appliedCoupon;

    const coupon = await Coupon.findOne({ code: couponCode });

    if (coupon) {
        appliedCoupon = coupon._id;
        console.log("Applied Coupon ID:", appliedCoupon);

        if (coupon.discountType === "percentage") {
            discountAmount = Math.floor((coupon.value / 100) * totalAmount);
        } else {
            discountAmount = coupon.value;
        }

        totalAmount = Math.max(0, totalAmount - discountAmount);
        await Coupon.updateOne({ _id: appliedCoupon }, { $inc: { usageLimit: -1 } });

        delete req.session.appliedCoupon;

        
        couponDetails = {
            code: coupon.code,
            discountType: coupon.discountType,
            value: coupon.value,
            minOrderAmount: coupon.minOrderAmount
        };
    }
}


        if(user.walletBalance<totalAmount){
            return res.status(400).json({success:false, message: "Your wallet balance is low. Please choose another payment method." })
        }
        user.walletBalance-=totalAmount;
        await user.save();

        const walletTransaction = new WalletTransaction({
            userId,
            amount: totalAmount,
            type: "Debit",
            description: "Order Payment"
        });

        await walletTransaction.save();


        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 5);

        const newOrder = new Order({
            userId,
            items: updatedItems,
            addressId,
            totalAmount,
            discountAmount,
            appliedCoupon,
            couponDetails,
            paymentMethod: "Wallet",
            deliveryDate,
            status: "Pending",
            paymentStatus: "Paid",
            transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            trackingNumber: `TRK-${Math.random().toString(36).substr(2, 10).toUpperCase()}`
        });
      

        await newOrder.save();
        console.log("Wallet Order Placed Successfully:", newOrder);

        await Cart.deleteOne({ userId });
        console.log("Cart cleared successfully");


        return res.status(200).json({
            success: true,
            message: "Order placed successfully.",
            order: newOrder,
            walletBalance: user.walletBalance
        });
        
    } catch (error) {
        console.error("Wallet Order Placement Error:", error);
        return res.status(500).json({ success: false, message: "Server Error", error });
    }
        
    }
