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
                    sizeKey: "$items.sizeKey",
                    quantity: "$items.quantity",
                    product: "$productDetails"
                }
            }
        ]);

        let totalPrice = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

        console.log("Cart data:", cart);
        console.log("Total Price:", totalPrice);

        res.render("user/cart", { cart, totalPrice, user: req.user });

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
            req.flash("error", "Product not found.");
            return res.redirect("/user/cart");
        }

        const sizeKey = `size${size}`;
        if (!["sizeS", "sizeM", "sizeL", "sizeXL", "sizeXXL"].includes(sizeKey)) {
            req.flash("error", "Invalid size selected.");
            return res.redirect("/user/cart");
        }

        if (product[sizeKey] < quantity) {
            req.flash("error", "Not enough stock available.");
            return res.redirect("/user/cart");
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
            console.log("New cart created:", cart);
        }
        
        // Check if the product already exists in the cart
        const existingItem = cart.items.find(item => 
            item.productId.equals(productId) && item.size === sizeKey
        );
        
        if (existingItem) {
            existingItem.quantity += parseInt(quantity);
        } else {
            cart.items.push({ productId, size: sizeKey, quantity });
        }
        
        // 🚀 **Ensure changes are detected**
        cart.markModified('items');
        
        await cart.save();
        console.log("Cart after saving:", await Cart.findOne({ userId })); // Debugging
        
        res.redirect("/user/cart");
        
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).send("Error adding to cart");
    }
};


// Update Cart Quantity
export const updateCartQuantity = async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        const userId = req.user._id;

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            req.flash("error", "Cart not found.");
            return res.redirect("/user/cart");
        }

        const item = cart.items.find(item => item._id.equals(itemId));
        if (!item) {
            req.flash("error", "Item not found in cart.");
            return res.redirect("/user/cart");
        }

        if (quantity < 1) {
            req.flash("error", "Quantity must be at least 1.");
            return res.redirect("/user/cart");
        }

        const product = await Product.findById(item.productId);
        if (!product || product[item.sizeKey] < quantity) {
            req.flash("error", "Not enough stock available.");
            return res.redirect("/user/cart");
        }

        item.quantity = parseInt(quantity);
        await cart.save();

        res.redirect("/user/cart");
    } catch (error) {
        console.error("Error updating cart quantity:", error);
        res.status(500).send("Error updating cart quantity");
    }
};

// Remove from Cart
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

// Checkout
export const checkout = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId });

        if (!cart || cart.items.length === 0) {
            req.flash("error", "Your cart is empty.");
            return res.redirect("/user/cart");
        }

        for (let item of cart.items) {
            const product = await Product.findById(item.productId);
            if (product) {
                product[item.sizeKey] -= item.quantity;
                await product.save();
            }
        }

        await Cart.deleteOne({ userId });
        res.redirect("/user/order-success");
    } catch (error) {
        console.error("Error in checkout:", error);
        res.status(500).send("Error in checkout process");
    }
};
