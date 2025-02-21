import mongoose from "mongoose";
import User from "../models/userSchema.js";
import Product from "../models/products.js";


export const getUsers = async (req, res) => {
    const page = parseInt(req.query.page) || 1; 
    const limit = 10; 
    const skip = (page - 1) * limit; 
  
    try {
      
      const users = await User.find({}, "fname email blocked displayName googleId")
        .skip(skip) 
        .limit(limit); 
  
      const totalUsers = await User.countDocuments();
      const totalPages = Math.ceil(totalUsers / limit); 
  
      
      res.render("admin/usersmanagement", {
        users,
        currentPage: page,
        totalPages,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Internal Server Error");
    }
  };

  
  export const toggleBlockUser = async (req, res) => {
   
    
    try {
        const email = req.params.email;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const user = await User.findOne({ email });

        if (!user) {  
            return res.status(404).json({ error: "User not found" });
        }
 
        user.blocked = !user.blocked;
        await user.save();

        res.json({ blocked: user.blocked });
    } catch (error) {
        console.error("Error toggling user block status:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


export const referorder = async (req, res) => {
  try {
    const adminReferralCode = req.session.admin.referralCode;

    // Fetch referred users and their details (same as your current code)
    const referredUsers = await User.find({ referredBy: adminReferralCode });
    let message = "No referred users found yet.";
    if (referredUsers && referredUsers.length > 0) {
      message = ""; 
    }

    // Get referred user details
    const referredUserDetails = await Promise.all(
      referredUsers.map(async (user) => {
        if (!user || !user.referralCode) {
          return null;
        }

        const referredCount = await User.countDocuments({ referredBy: user.referralCode });

        return {
          fname: user.fname,
          email: user.email,
          referralCode: user.referralCode,
          referredCount: referredCount
        };
      })
    );

    const validReferredUserDetails = referredUserDetails.filter((user) => user !== null);

   
    if (validReferredUserDetails.length === 0) {
      validReferredUserDetails.push({
        fname: "No Referred User",
        email: "N/A",
        referralCode: "N/A",
        referredCount: 0
      });
    }

    const products = await Product.find();

 
    res.render("admin/referraloffer", {
      referredUserDetails: validReferredUserDetails,
      message: message,
      products: products  
    });

  } catch (error) {
    console.error("Error getting referred details:", error.message);
    return res.status(500).send("Failed to fetch referred details.");
  }
};


export const referraldiscount = async (req, res) => {
  try {
    const adminReferralCode = req.user.referralCode;  
    const referredUsers = await User.find({ referredBy: adminReferralCode });

    if (referredUsers.length === 0) {
      return res.redirect("/admin/referraloffer");
    }

    const product = await Product.findById(req.body.id);
    if (!product) {
      return res.redirect("/admin/referraloffer");
    }

   
    if (!product.isOfferActive || !product.discountPercentage) {
      return res.redirect("/admin/referraloffer");
    }

  
    const discountAmount = (product.Offerprice * product.discountPercentage) / 100;
    const finalPrice = (product.Offerprice - discountAmount).toFixed(2);

    console.log(finalPrice);
    

   
    res.json({
      message: "Referral offer applied successfully.",
      originalPrice: product.Offerprice,
      discountPercentage: product.discountPercentage,
      discountAmount: discountAmount,
      finalPrice: finalPrice
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Failed to apply referral offer.");
  }
};


export const applyoffer = async (req, res) => {
  try {
    const { offerPercentage, userId } = req.body;

    // Validate the offer percentage
    if (!offerPercentage || offerPercentage < 1 || offerPercentage > 100) {
      return res.status(400).send("Invalid offer percentage. Please enter a value between 1 and 100.");
    }

    // Find the referred user by their ID
    const referredUser = await User.findById(userId);
    if (!referredUser) {
      return res.status(404).send("Referred user not found.");
    }

    // Find the products associated with the referred user
    const userProducts = await Product.find({ userId: referredUser._id }); // Assuming `userId` is stored in the product model

    if (userProducts.length === 0) {
      return res.status(404).send("No products found for the referred user.");
    }

    // Calculate the discount and apply it only to the referred user's products
    const discountAmount = (offerPercentage / 100) * referredUser.price; // Example, applying discount to user's price
    const finalPrice = (referredUser.price - discountAmount).toFixed(2);

    // Update the products with the new offer price
    await Product.updateMany(
      { _id: { $in: userProducts.map(product => product._id) } },
      { 
        $set: {
          Offerprice: finalPrice,
          isOfferActive: true,
          discountPercentage: offerPercentage
        }
      });

    res.status(200).send("Offer applied successfully to the selected user's products.");
  } catch (error) {
    console.error("Error applying offer:", error);
    res.status(500).send("Failed to apply offer.");
  }
};
