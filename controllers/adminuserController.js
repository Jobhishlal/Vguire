import mongoose from "mongoose";
import User from "../models/userSchema.js";


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
