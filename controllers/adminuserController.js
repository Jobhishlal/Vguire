import mongoose from "mongoose";
import User from "../models/userSchema.js";

// Get all users
export const getUsers = async (req, res) => {
    const page = parseInt(req.query.page) || 1; 
    const limit = 10; 
    const skip = (page - 1) * limit; 
  
    try {
      // Get users for the current page
      const users = await User.find({}, "fname email blocked displayName googleId")
        .skip(skip) // Skip users based on the page number
        .limit(limit); // Limit the number of users per page
  
      // Get the total count of users for pagination
      const totalUsers = await User.countDocuments();
      const totalPages = Math.ceil(totalUsers / limit); 
  
      // Render the users and pass pagination data to the view
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
      const userId = req.params.id; 
  
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).send("Invalid user ID");
      }
  
   
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).send("User not found");
      }
  
    
      user.blocked = !user.blocked; 
      await user.save(); 
    
      res.redirect(`/admin/usersmanagement?page=${req.query.page || 1}`);
    } catch (error) {
      console.error("Error toggling user block status:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  