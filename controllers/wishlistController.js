import Wishlist from "../models/wishlist.js";


export const getwishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ userId: req.user._id }).populate("products");

        const wishlistProductIds = wishlist ? wishlist.products.map(product => product._id.toString()) : [];

        res.render("user/wishlist", {
            wishlist: wishlist ? wishlist.products : [],
            wishlistProductIds 
        });
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
export const postwishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user._id;

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

     
        if (wishlist.products.includes(productId)) {
            return res.json({ success: false, message: "Product already in wishlist" });
        }

        
        if (wishlist.products.length >= 5) {
            return res.json({ success: false, message: "Wishlist limit reached (Max: 5 items)" });
        }

        wishlist.products.push(productId);
        await wishlist.save();

        res.json({ success: true, message: "Product added to wishlist" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



export const togglewishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user._id;

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = await Wishlist.create({ userId, products: [productId] });
            return res.json({ success: true, added: true });
        }

       
        const productIndex = wishlist.products.indexOf(productId);

        if (productIndex === -1) {
           
            wishlist = await Wishlist.findOneAndUpdate(
                { userId },
                { $push: { products: productId } },
                { new: true } 
            );
            return res.json({ success: true, added: true });
        } else {
          
            wishlist = await Wishlist.findOneAndUpdate(
                { userId },
                { $pull: { products: productId } },
                { new: true }
            );
            return res.json({ success: true, added: false });
        }
    } catch (error) {
        console.error("Error toggling wishlist:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const wishlistcount = async (req,res)=>{
    try {
        const wishlist = await Wishlist.findOne({ userId: req.user._id });
        const count = wishlist ? wishlist.products.length : 0;
        res.json({ success: true, count });
    } catch (error) {
        console.error("Error fetching wishlist count:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}