import Cart from '../models/cart.js';
import Product from '../models/products.js';
import mongoose from "mongoose";


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
                    price: {
                        $cond: {
                            if: "$productDetails.isOfferActive",
                            then: "$productDetails.Offerprice",
                            else: "$productDetails.price"
                        }
                    }
                }
            }
        ]);

        let totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

        console.log("Cart Data:", cart);
        res.render("user/cart", { 
            cart, 
            user: req.user, 
            totalPrice,
            messages: {
                success: req.flash("success"),
                error: req.flash("error")
            },
            breadcrumbs: res.locals.breadcrumbs
            
            

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
        
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
        }

        const userId = req.user._id;
        const MAX_QUANTITY_PER_ITEM = 5; 

        const parsedQuantity = parseInt(quantity, 10);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ success: false, message: "Invalid quantity!" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found. Please try again!" });
        }

        const validSizes = new Set(["S", "M", "L", "XL", "XXL"]);
        if (!validSizes.has(size)) {
            return res.status(400).json({ success: false, message: "Invalid size selected. Choose a valid size!" });
        }

        const sizeKey = `size${size}`;
        if (product[sizeKey] < parsedQuantity) {
            return res.status(400).json({ success: false, message: `Only ${product[sizeKey]} items left in stock!` });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

       
        const finalPrice = product.isOfferActive ? product.Offerprice : product.price;

        const existingItem = cart.items.find(item => 
            item.productId.equals(productId) && item.size === size
        );

        if (existingItem) {
            const totalQuantity = existingItem.quantity + parsedQuantity;
            if (totalQuantity > MAX_QUANTITY_PER_ITEM) {
                return res.status(400).json({
                    success: false,
                    message: `You can only add up to ${MAX_QUANTITY_PER_ITEM} of this item!`
                });
            }
            existingItem.quantity = totalQuantity;
            existingItem.totalPrice = existingItem.quantity * finalPrice;
        } else {
            if (parsedQuantity > MAX_QUANTITY_PER_ITEM) {
                return res.status(400).json({
                    success: false,
                    message: ` Maximum ${MAX_QUANTITY_PER_ITEM} items per product allowed!`
                });
            }
            cart.items.push({
                productId,
                size,
                quantity: parsedQuantity,
                price: finalPrice,
                totalPrice: finalPrice * parsedQuantity
            });
        }

        cart.markModified("items");
        await cart.save();

        return res.json({
            success: true,
            message: "Product added to cart successfully!",
            redirectUrl: "/user/cart"
        });

    } catch (error) {
        console.error("Error adding to cart:", error);
        return res.status(500).json({ success: false, message: "Error adding item to cart. Please try again!" });
    }
};



export const updateCartQuantity = async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        const userId = req.user._id;
        console.log(itemId,quantity);
        

        let cart = await Cart.findOne({ userId });
        if (!cart) return res.status(400).json({ error: "Cart not found" });

        
        const objectItemId = new mongoose.Types.ObjectId(itemId);
        const item = cart.items.find(item => item._id.equals(objectItemId));
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