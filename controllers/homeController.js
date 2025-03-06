import Product from "../models/products.js";
import Cart from "../models/cart.js";
import Category from "../models/category.js";
import Order from "../models/order.js";


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

        const productsWithAvgRating = products.map(product => ({
            ...product.toObject(),
            avgRating: ratingsMap.get(product._id.toString()) || "No ratings yet"
        }));

        const categories = await Category.find({ isListed: false });
        const latestProduct = await Product.find().sort({ createdAt: -1 }).limit(1);

        let wishlistProducts = [];
        if (req.user) {
            const wishlist = await Wishlist.findOne({ userId: req.user._id });
            if (wishlist) {
                wishlistProducts = wishlist.products.map(p => p.toString());
            }
        }
        

        let cartItems = [];
        if (req.user) {
            const cart = await Cart.findOne({ userId: req.user._id });
            cartItems = cart ? cart.items : [];
        }
        console.log("cart home",cartItems);
        

        res.render("user/home", {
            user: req.user,
            categories,
            product: productsWithAvgRating, 
            date: latestProduct,
            cartItems,
            session: req.session,
            wishlistProducts
        });
    } catch (error) {
        console.error("Error fetching homepage data:", error);
        res.status(500).send("Internal Server Error");
    }
};

