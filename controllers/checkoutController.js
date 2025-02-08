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
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart || cart.items.length === 0) {
            return res.redirect("/cart");
        }

        const addresses = await Address.find({ userId });
        const totalAmount = cart.items.reduce((total, item) => total + (item.productId.price * item.quantity), 0);

        res.render("user/checkout", {
            items: cart.items.map(item => ({
                size: item.size,
                product: item.productId,
                quantity: item.quantity,
                price: item.productId.price
            })),
            addresses,
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
        let { addressId, items, paymentMethod = "COD" } = req.body;
        const userId = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).send("Invalid address selected. Please choose a valid address.");
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).send("No items found in the order.");
        }

        const productIds = items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });

        if (!products || products.length === 0) {
            return res.status(400).send("Invalid products in order.");
        }

        const updatedItems = items.map(item => {
            const product = products.find(p => p._id.toString() === item.productId);
            if (!product) return null;

            if (product[item.size] < item.quantity) {
                return res.status(400).send(`Only ${product[item.size]} items available for size ${item.size}`);
            }

            return { productId: product._id, quantity: item.quantity, size: item.size, price: product.price, totalprice: product.price * item.quantity };
        }).filter(item => item !== null);

        const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalprice, 0);

        for (let item of updatedItems) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { [`${item.size}`]: -item.quantity, totalStock: -item.quantity }
            });
        }

        const newOrder = new Order({
            userId,
            items: updatedItems,
            addressId,
            totalAmount,
            paymentMethod,
            status: "Pending",
            transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            trackingNumber: `TRK-${Math.random().toString(36).substr(2, 10).toUpperCase()}`
        });
              console.log(newOrder);
              
        await newOrder.save();
        res.redirect("/user/orders");

    } catch (error) {
        console.error("Order Placement Error:", error);
        res.status(500).send("Server Error");
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
        const updatedData = req.body;
        const updatedAddress = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });

        if (!updatedAddress) {
            return res.status(404).json({ success: false, error: "Address not found" });
        }

        const redirectUrl = req.body.redirectUrl || "/user/checkout";
        return res.redirect(`/user/checkout/single?productId=${productId}&quantity=${quantity}&size=${size}`);
    } catch (error) {
        console.error("Edit Address Error:", error);
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

        // Check stock availability
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
