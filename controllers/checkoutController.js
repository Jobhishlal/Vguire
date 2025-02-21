

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
};export const buyNowCartView = async (req, res) => {
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

        // ✅ Filter out used coupons
        const availableCoupons = await Coupon.find({
            usedByUsers: { $ne: userId },  
            expirationDate: { $gte: new Date() },  
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
        
            
                await Coupon.updateOne({ _id: appliedCoupon }, { $inc: { usageLimit: -1 } });
        
                delete req.session.appliedCoupon; 
            }
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
            paymentMethod,
            deliveryDate,
            status: "Pending",
            paymentStatus,
            transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            trackingNumber: `TRK-${Math.random().toString(36).substr(2, 10).toUpperCase()}`
        });
        

        await newOrder.save();
        console.log("Order placed successfully:", newOrder);

        return res.redirect("/user/order-success");

    } catch (error) {
        console.error("Order Placement Error:", error);
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

        return res.json({ success: true, redirectUrl: redirectUrl || "/user/checkout" });

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
            return res.redirect("/user/cart");
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
            flashMessage: req.session.flashMessage || null
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
            totalPages: Math.ceil(totalOrders / limit)
        });
    } catch (error) {
        console.error("Order Details Fetch Error:", error);
        res.status(500).send("Server Error");
    }
};

export const orderview = async (req, res) => { 
    try {
        console.log("Received params:", req.params);

        const userId = req.user._id;
        const { orderId } = req.params;

        if (!orderId) {
            console.error("orderId is missing in req.params!");
            return res.redirect("/user/order-details");
        }

        const order = await Order.findOne({ _id: orderId, userId })
            .populate("items.productId")
            .populate("addressId")
            .populate("appliedCoupon"); // Populate the coupon details

        if (!order) {
            req.flash("error", "Order not found");
            return res.redirect("/user/order-details");
        }

        let subtotal = 0;
        let totalProductDiscount = 0;

        // 1️⃣ Calculate Product-Level Discounts
        order.items.forEach(item => {
            let productPrice = item.productId?.price || 0;
            let offerPrice = item.productId?.Offerprice || productPrice; // If no offer, use original price
            let discountPerItem = productPrice - offerPrice;
            let totalDiscountPerProduct = discountPerItem * item.quantity;
            let totalPrice = productPrice * item.quantity;

            subtotal += totalPrice; 
            totalProductDiscount += totalDiscountPerProduct; // Sum up product-level discounts
        });

        let couponDiscount = 0;
        if (order.appliedCoupon) {
            const coupon = order.appliedCoupon;
            if (coupon.discountType === "flat") {
                couponDiscount = coupon.discountValue; 
            } else if (coupon.discountType === "percentage") {
                couponDiscount = (subtotal * coupon.discountValue) / 100; 
            }
        }

        order.discountAmount = totalProductDiscount + couponDiscount;
        order.totalAmount = subtotal - order.discountAmount;

        res.render("user/order-view", {
            order,
            orders: [order],
            userId
        });
    } catch (error) {
        console.error("Order find error:", error);
        return res.redirect("/user/home");
    }
};

export const ordercancel = async (req, res) => {
    try {
        const userId = req.user._id;
        const { orderId, productId } = req.params;

        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect(`/user/order-view/${orderId}`);
        }

        const itemIndex = order.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) {
            req.flash("error", "Product not found in order.");
            return res.redirect(`/user/order-view/${orderId}`);
        }

        const item = order.items[itemIndex];

        if (order.status === "Delivered") {
            req.flash("error", "Delivered products can't be canceled.");
            return res.redirect(`/user/order-view/${orderId}`);
        }

        const product = await Product.findById(productId);
        if (!product) {
            req.flash("error", "Product not found.");
            return res.redirect(`/user/order-view/${orderId}`);
        }

    
        if (item.size) {
            const sizeKey = `size${item.size.trim()}`;
            if (product[sizeKey] !== undefined) {
                product[sizeKey] += item.quantity;
            } else {
                console.warn(`Size ${sizeKey} not found in product ${productId}`);
            }
        }


        product.totalStock += item.quantity;
        await product.save();

      
        order.items.splice(itemIndex, 1);

        
        if (order.items.length === 0) {
            order.status = "Cancelled";
        }

        await order.save();

        req.flash("success", "Product canceled successfully.");
        return res.redirect(`/user/order-view/${orderId}`);
    } catch (error) {
        console.error(" Product Cancellation Error:", error);
        return res.status(500).send("Product cancellation failed.");
    }
};


// export const ordercancel = async (req, res) => {
//     try {
//         const userId = req.user._id;
//         const { orderId, productId } = req.params;

//         const order = await Order.findOne({ _id: orderId, userId });
//         if (!order) {
//             req.flash("error", "Order not found.");
//             return res.redirect(`/user/order-view/${orderId}`);
//         }

//         const itemIndex = order.items.findIndex(item => item.productId.toString() === productId);
//         if (itemIndex === -1) {
//             req.flash("error", "Product not found in order.");
//             return res.redirect(`/user/order-view/${orderId}`);
//         }

//         const item = order.items[itemIndex];

//         if (order.status === "Delivered") {
//             req.flash("error", "Delivered products can't be canceled.");
//             return res.redirect(`/user/order-view/${orderId}`);
//         }

//         const product = await Product.findById(productId);
//         if (!product) {
//             req.flash("error", "Product not found.");
//             return res.redirect(`/user/order-view/${orderId}`);
//         }

      
//         if (item.size) {
//             const sizeKey = `size${item.size.trim()}`;
//             if (product[sizeKey] !== undefined) {
//                 product[sizeKey] += item.quantity;
//             } else {
//                 console.warn(`Size ${sizeKey} not found in product ${productId}`);
//             }
//         }

//         product.totalStock += item.quantity;
//         await product.save();

    
//         order.items[itemIndex].status = "Cancelled";

   
//         if (order.items.every(item => item.status === "Cancelled")) {
//             order.status = "Cancelled";
//         }

//         await order.save();

//         req.flash("success", "Product canceled successfully.");
//         return res.redirect(`/user/order-view/${orderId}`);
//     } catch (error) {
//         console.error(" Product Cancellation Error:", error);
//         return res.status(500).send("Product cancellation failed.");
//     }
// };


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
       console.log("userId getil kitty",userId);//successfully get userId
      
       
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
//             totalAmount, 
//             couponCode=0,
//             userId 
//         } = req.body;
  
//         console.log(couponCode);
        
//         const extractedUserId = req.user?._id?.toString() || userId;
//         console.log("Final User ID:", extractedUserId);

       
//         if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !extractedUserId || !items || !addressId || !totalAmount) {
//             return res.status(400).json({ success: false, message: "Missing required payment details" });
//         }
        
//         let discountAmount = 0;
//         let appliedCoupon = null;
        
//         if (req.session.appliedCoupon) {
//             const couponCode = typeof req.session.appliedCoupon === "object"
//                 ? req.session.appliedCoupon.code
//                 : req.session.appliedCoupon;
        
//             const coupon = await Coupon.findOne({ code: couponCode });
        
//             if (coupon) {
//                 appliedCoupon = coupon._id; 
        
//                  console.log(appliedCoupon);
                 
//                 if (coupon.discountType === "percentage") {
//                     discountAmount = Math.floor((coupon.value / 100) * totalAmount); 
//                 } else {
//                     discountAmount = coupon.value;
//                 }
        
                
//                 totalAmount = Math.max(0, totalAmount - discountAmount);
        
            
//                 await Coupon.updateOne({ _id: appliedCoupon }, { $inc: { usageLimit: -1 } });
        
//                 delete req.session.appliedCoupon; 
//             }
//         }
//         console.log("code",req.session.appliedCoupon);
        
        
        
        

//         const productIds = items.map(item => item.productId);
//         const products = await Product.find({ _id: { $in: productIds } });

//         if (!products || products.length === 0) {
//             return res.status(400).json({ success: false, message: "Invalid products in order" });
//         }

//         let outOfStockItems = [];
//         let updatedItems = [];

//         for (let item of items) {
//             const product = products.find(p => p._id.toString() === item.productId);
//             if (!product) continue;

//             const sizeKey = `size${item.size.trim().replace(/^size/i, "").toUpperCase()}`;
//             const sizeStock = product[sizeKey] !== undefined ? product[sizeKey] : 0;

//             if (sizeStock < parseInt(item.quantity)) {
//                 outOfStockItems.push({
//                     productName: product.name,
//                     availableStock: sizeStock,
//                     size: item.size
//                 });
//                 continue;
//             }

      
//             const updateFields = { totalStock: -parseInt(item.quantity) };
//             if (sizeKey in product) {
//                 updateFields[sizeKey] = -parseInt(item.quantity);
//             }

//             await Product.findByIdAndUpdate(item.productId, { $inc: updateFields }, { new: true });

//             updatedItems.push({
//                 productId: product._id,
//                 size: item.size,
//                 quantity: parseInt(item.quantity),
//                 price: product.Offerprice > 0 ? product.Offerprice : product.price,
//                 totalprice: (product.Offerprice > 0 ? product.Offerprice : product.price) * item.quantity
//             });
//         }

//         if (updatedItems.length === 0) {
//             return res.status(400).json({ success: false, message: "All items are out of stock" });
//         }

//         const estimatedDeliveryDate = new Date();
//         estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5);


//         const finalAmount = parseFloat(totalAmount) - parseFloat(discountAmount || 0);

//         console.log("Final Calculated Amount:", finalAmount); 

        

//         const newOrder = new Order({
//             userId: extractedUserId,
//             items: updatedItems,
//             addressId,
//             totalAmount: parseFloat(totalAmount), 
//             totalPrice: finalAmount,
//             paymentId: razorpay_payment_id,
//             paymentStatus: "Paid",
//             orderStatus: "Processing",
//             couponDiscount: discountAmount,
//             appliedCoupon,
//             paymentMethod: "UPI",
//             deliveryDate: estimatedDeliveryDate
//         });
//         console.log("her work or",appliedCoupon);
        

//         await newOrder.save();

//         console.log("Order placed successfully:", newOrder);

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
            userId 
        } = req.body;

        let totalAmount = initialTotalAmount; // Use let to allow reassignment

        console.log(couponCode);
        
        const extractedUserId = req.user?._id?.toString() || userId;
        console.log("Final User ID:", extractedUserId);

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !extractedUserId || !items || !addressId || !totalAmount) {
            return res.status(400).json({ success: false, message: "Missing required payment details" });
        }
        
        let discountAmount = 0;
        let appliedCoupon = null;
        
        if (req.session.appliedCoupon) {
            const couponCode = typeof req.session.appliedCoupon === "object"
                ? req.session.appliedCoupon.code
                : req.session.appliedCoupon;
        
            const coupon = await Coupon.findOne({ code: couponCode });
        
            if (coupon) {
                appliedCoupon = coupon._id; 
        
                console.log(appliedCoupon);
                
                if (coupon.discountType === "percentage") {
                    discountAmount = Math.floor((coupon.value / 100) * totalAmount); 
                } else {
                    discountAmount = coupon.value;
                }
        
                totalAmount = Math.max(0, totalAmount - discountAmount);
        
                await Coupon.updateOne({ _id: appliedCoupon }, { $inc: { usageLimit: -1 } });
        
                delete req.session.appliedCoupon; 
            }
        }
        console.log("code", req.session.appliedCoupon);
        
        const productIds = items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });

        if (!products || products.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid products in order" });
        }

        let outOfStockItems = [];
        let updatedItems = [];

        for (let item of items) {
            const product = products.find(p => p._id.toString() === item.productId);
            if (!product) continue;

            const sizeKey = `size${item.size.trim().replace(/^size/i, "").toUpperCase()}`;
            const sizeStock = product[sizeKey] !== undefined ? product[sizeKey] : 0;

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

            await Product.findByIdAndUpdate(item.productId, { $inc: updateFields }, { new: true });

            updatedItems.push({
                productId: product._id,
                size: item.size,
                quantity: parseInt(item.quantity),
                price: product.Offerprice > 0 ? product.Offerprice : product.price,
                totalprice: (product.Offerprice > 0 ? product.Offerprice : product.price) * item.quantity
            });
        }

        if (updatedItems.length === 0) {
            return res.status(400).json({ success: false, message: "All items are out of stock" });
        }

        const estimatedDeliveryDate = new Date();
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5);

        const finalAmount = parseFloat(totalAmount) - parseFloat(discountAmount || 0);

        console.log("Final Calculated Amount:", finalAmount); 

        const newOrder = new Order({
            userId: extractedUserId,
            items: updatedItems,
            addressId,
            totalAmount: parseFloat(totalAmount), 
            totalPrice: finalAmount,
            paymentId: razorpay_payment_id,
            paymentStatus: "Paid",
            orderStatus: "Processing",
            couponDiscount: discountAmount,
            appliedCoupon,
            paymentMethod: "UPI",
            deliveryDate: estimatedDeliveryDate
        });

        console.log("her work or", appliedCoupon);
        
        await newOrder.save();

        console.log("Order placed successfully:", newOrder);

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

        // ✅ Add user to usedByUsers list in DB
        await Coupon.findOneAndUpdate(
            { code: couponcode },
            { $addToSet: { usedByUsers: userId } }
        );

        req.session.appliedCoupon = { code: couponcode, discountAmount };

        return res.json({
            success: true,
            discountAmount,
            finalAmount,
            message: "Coupon applied successfully",
        });
    } catch (error) {
        console.error("Coupon error:", error);
        res.status(500).json({ success: false, message: "Server error! Try again later." });
    }
};
