

import Cart from '../models/cart.js';
import Product from '../models/products.js';
import Address from '../models/address.js';
import Order from '../models/order.js';
import mongoose from 'mongoose';


export const singlecheckout = async (req, res) => {
    try {
        const { productId, quantity, size } = req.body;
        const userId = req.user._id;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Product not found");

        const addresses = await Address.find({ userId });

        res.render("user/checkout", {
            items: [{ product, quantity, price: product.price, size }],
            addresses,
            totalAmount: product.price * parseInt(quantity),
            currentCheckoutUrl: `/user/checkout/single?productId=${productId}&quantity=${quantity}&size=${size}`,
            checkoutType: 'single',
            flashMessage: req.session.flashMessage || null
        });
        delete req.session.flashMessage;

    } catch (error) {
        console.error("Checkout Error:", error);
        res.status(500).send("Server Error");
    }
};

export const buyNowCartView = async (req, res) => {
    console.log("i am buy now cart");
    
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.productId");

        if (!cart || cart.items.length === 0) {
            return res.redirect("/cart");
        }

        const addresses = await Address.find({ userId });
       const selectedAddressId = addresses.length > 0 ? addresses[0]._id.toString() : '';

        const totalAmount = cart.items.reduce((total, item) => total + (item.productId.price * item.quantity), 0);

        res.render("user/checkout", {
            items: cart.items.map(item => ({
                size: item.size,
                product: item.productId,
                quantity: item.quantity,
                price: item.productId.price
            })),
            addresses,
          selectedAddressId,
            totalAmount,
            currentCheckoutUrl: "/user/checkout",
            checkoutType: "cart",
            flashMessage: req.session.flashMessage || null
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
        const totalAmount = cart.items.reduce((total, item) => total + (item.productId.price * item.quantity), 0);

        res.render("user/checkout", {
            items: cart.items.map(item => ({
                size: item.size,
                product: item.productId,
                quantity: item.quantity,
                price: item.productId.price
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
        console.log(" Request Body:", req.body);

        let { addressId, items, paymentMethod = "COD" } = req.body;
        let checkoutType = req.body.checkoutType || "cart";

        console.log(" Checkout Type:", checkoutType);
        const userId = req.user?._id;
        console.log(" Received Address ID:", addressId);

        const cart = await Cart.findOne({ userId }).populate("items.productId");
        console.log(" Cart Data:", cart);

        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).send(" Invalid address selected. Please choose a valid address.");
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).send(" No items found in the order.");
        }

        console.log(" Valid items received:", items);

       
        const productIds = items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });

        if (!products || products.length === 0) {
            return res.status(400).send(" Invalid products in order.");
        }

        let outOfStockItems = [];
        let updatedItems = [];

        for (let item of items) {
            const product = products.find(p => p._id.toString() === item.productId);
            if (!product) {
                console.error(` Product not found: ${item.productId}`);
                continue;
            }


            const sizeKey = `size${item.size.trim().replace(/^size/i, "").toUpperCase()}`;
                  
        
            
        

            console.log(" Available Product Fields:", Object.keys(product));
            console.log(" Looking for size key:", sizeKey);

            if (!(sizeKey in product)) {
                console.error(` Size key "${sizeKey}" not found in product:`, product);
            }

           
            const sizeStock = product[sizeKey] !== undefined ? product[sizeKey] : 0;
            console.log(` Available Stock for ${product.name} (${sizeKey}):`, sizeStock);

            if (sizeStock < parseInt(item.quantity)) {
                outOfStockItems.push({
                    productName: product.name,
                    availableStock: sizeStock,
                    size: item.size
                });
                continue;
            }

            const updateFields = {
                totalStock: -parseInt(item.quantity)
            };

            if (sizeKey in product) {
                updateFields[sizeKey] = -parseInt(item.quantity);
            }

            const updatedProduct = await Product.findByIdAndUpdate(
                item.productId,
                { $inc: updateFields },
                { new: true }
            );

            console.log(` Updated stock for ${updatedProduct.name} - Size: ${item.size}, New Stock: ${updatedProduct[sizeKey]}, New Total Stock: ${updatedProduct.totalStock}`);

            updatedItems.push({
                productId: product._id,
                quantity: parseInt(item.quantity),
                size: item.size,
                price: parseInt(product.price),
                totalprice: parseInt(product.price) * parseInt(item.quantity)
            });
        }

    
        if (updatedItems.length === 0) {
            console.error(" No valid items available for order. Order not placed.");
            return res.status(400).send("All items are out of stock. Please update your cart.");
        }

 
        const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalprice, 0);

        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 5);

        const newOrder = new Order({
            userId,
            items: updatedItems,

            addressId,
            totalAmount,
            paymentMethod,
            deliveryDate,
            status: "Pending",
            transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            trackingNumber: `TRK-${Math.random().toString(36).substr(2, 10).toUpperCase()}`
        });
        console.log("size check",updatedItems);
        

        await newOrder.save();
        console.log(" Order placed successfully:", newOrder);

        return res.redirect("/user/order-success");

    } catch (error) {
        console.error(" Order Placement Error:", error);
        return res.status(500).send("Server Error");
    }
};

export const addaddress = async (req, res) => {
    try {
        const addressData = req.body;
        addressData.userId = req.user._id;
        const newAddress = new Address(addressData);
        await newAddress.save();

        const redirectUrl = req.body.redirectUrl || "/user/checkout";
        return res.redirect(redirectUrl);
    } catch (error) {
        console.error("Address Addition Error:", error);
        return res.status(500).send("Error adding address");
    }
};

export const editaddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const { productId, quantity, size, redirectUrl } = req.body;

    

        const updatedData = req.body;
        const updatedAddress = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });

        if (!updatedAddress) {
            return res.status(404).json({ success: false, error: "Address not found" });
        }

       
        if (productId && quantity && size) {
            return res.redirect(`/user/checkout/single?productId=${productId}&quantity=${quantity}&size=${size}`);
        } else {
            return res.redirect(redirectUrl || "/user/checkout");
        }
    } catch (error) {
        console.error(" Edit Address Error:", error);
        return res.status(500).send("Error editing address");
    }
};



export const singleCheckoutView = async (req, res) => {
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
        console.log("quantity check",quantity);

        console.log("user choose address id",selectedAddressId);
        
        

        res.render("user/checkout", {
            items: [{ product, quantity, price: product.price, size }],
            addresses,
            selectedAddressId,
            totalAmount: product.price * quantity, 
            currentCheckoutUrl: `/user/checkout/single?productId=${productId}&size=${size}`,
            checkoutType: true 
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

        const updatedItems = cart.items.map(item => {
            const product = item.productId;
            if (!product) return null;

            const availableStock = product[item.size] || 0;
            if (availableStock < item.quantity) {
                outOfStockItems.push({ productName: product.name, availableStock, size: item.size });
            }

            totalAmount += product.price * item.quantity;
            return { product, quantity: item.quantity, price: product.price, size: item.size, availableStock };
        }).filter(item => item !== null);

        if (outOfStockItems.length > 0) {
            req.session.flashMessage = {
                type: "error",
                message: `Some items are out of stock: ${outOfStockItems.map(i => `${i.productName} (Size: ${i.size}) - Available: ${i.availableStock}`).join(", ")}`
            };
            return res.redirect("/user/cart");
        }

        const selectedAddressId = addresses.length > 0 ? addresses[0]._id.toString() : '';

        res.render("user/checkout", {
            items: updatedItems,
            addresses,
            selectedAddressId,
            totalAmount,
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
        console.log(" Received params:", req.params);  

        const userId = req.user._id;
        const { orderId } = req.params;

        if (!orderId) {
            console.error("orderId is missing in req.params!");
            return res.redirect("/user/order-details");
        }

        const order = await Order.findOne({ _id: orderId, userId })
            .populate("items.productId")
            .populate("addressId");

        if (!order) {
            req.flash("error", "Order not found");
            return res.redirect("/user/order-details");
        }

        res.render("user/order-view", {
            order,  
            orders: [order],  
            userId
        });
    } catch (error) {
        console.error(" Order find error:", error);
        return res.redirect("/user/home");
    }
};



export const ordercancel = async (req, res) => {
    try {
        const userId = req.user._id;
        const { orderId } = req.params;

        const order = await Order.findOne({ _id: orderId, userId });

        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect(`/user/order-view/${orderId}`);
        }

        if (order.status === "Delivered") {
            req.flash("error", "Delivered products can't be canceled.");
            return res.redirect(`/user/order-view/${orderId}`);
        }

        for (let item of order.items) {
            const sizeKey = `size${item.size}`;
            const product = await Product.findById(item.productId);
            if (!product) continue;

            if (product[sizeKey] !== undefined) {
                product[sizeKey] += item.quantity;
            }

            product.totalStock += item.quantity;
            await product.save();
        }

        order.status = "Cancelled";
        await order.save();

        req.flash("success", "Order canceled successfully.");
        return res.redirect(`/user/order-view/${orderId}`);
    } catch (error) {
        console.error("Order Cancellation Error:", error);
        return res.status(500).send("Order cancellation failed.");
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
