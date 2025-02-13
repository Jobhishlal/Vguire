import Cart from '../models/cart.js';
import Product from '../models/products.js';

// Get Cart Items
export const getcart = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.aggregate([
            { $match: { userId: userId } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    _id: "$items._id",
                    size: "$items.size",
                    quantity: "$items.quantity",
                    product: "$productDetails",
                    price: "$productDetails.price"
                }
            }
        ]);

        let totalPrice = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

        console.log("Cart Data:", cart);
       res.render("user/cart", { 
            cart: cart, 
            user: req.user, 
            totalPrice,
            messages: {
                success: req.flash("success"),
                error: req.flash("error")
            }
        });
    } catch (error) {
        console.error("Cart error:", error);
        res.status(500).send("Cart find error");
    }
};


// Add to Cart
export const addToCart = async (req, res) => {
    try {
        const { productId, size, quantity } = req.body;
        const userId = req.user._id;

        console.log("Received add-to-cart request:", { productId, size, quantity });

        const product = await Product.findById(productId);
        if (!product) {
            return res.json({ success: false, message: "⚠️ Product not found. Please try again!" });
        }

        const sizeKey = `size${size}`; // e.g., "sizeS", "sizeM", etc.
        if (!["sizeS", "sizeM", "sizeL", "sizeXL", "sizeXXL"].includes(sizeKey)) {
            return res.json({ success: false, message: "Invalid size selected. Choose a valid size!" });
        }

        if (product[sizeKey] < quantity) {
            return res.json({ success: false, message: `Only ${product[sizeKey]} items left in stock!` });
        }

        // Find or create a cart for the user
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // Check if the item already exists in the cart (same product and size)
        const existingItem = cart.items.find(item => 
            item.productId.equals(productId) && item.size === sizeKey
        );

        if (existingItem) {
            // Ensure the total quantity does not exceed the available stock
            if (existingItem.quantity + parseInt(quantity) > product[sizeKey]) {
                return res.json({ success: false, message: `⚠️ Only ${product[sizeKey]} items available in stock!` });
            }
            existingItem.quantity += parseInt(quantity);
            existingItem.totalPrice = existingItem.quantity * product.price; 
        } else {
            cart.items.push({ 
                productId, 
                size: sizeKey, 
                quantity: parseInt(quantity),
                price: product.price,              
                totalPrice: product.price * quantity 
            });
        }

        cart.markModified("items");
        await cart.save();
        return res.redirect("/user/cart");

    } catch (error) {
        console.error("Error adding to cart:", error);
        return res.status(500).json({ success: false, message: "Error adding item to cart. Please try again!" });
    }
};




export const updateCartQuantity = async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        const userId = req.user._id;

        let cart = await Cart.findOne({ userId });
        if (!cart) return res.status(400).json({ error: "Cart not found" });

        const item = cart.items.find(item => item._id.equals(itemId));
        if (!item) return res.status(400).json({ error: "Item not found" });

        const product = await Product.findById(item.productId);
        if (!product || product[item.size] < quantity) { 
            return res.status(400).json({ error: "Stock unavailable" });
        }

        if (quantity > 5) return res.status(400).json({ error: "Max 5 items allowed" });

        item.quantity = parseInt(quantity);
        await cart.save();

        return res.status(200).json({ message: "Cart updated successfully" });
    } catch (error) {
        console.error("Error updating cart quantity:", error);
        return res.status(500).json({ error: "Server error" });
    }
};


export const removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.user._id;

        await Cart.updateOne(
            { userId },
            { $pull: { items: { _id: itemId } } }
        );

        res.redirect("/user/cart");
    } catch (error) {
        console.error("Error removing item:", error);
        res.status(500).send("Error removing item");
    }
};