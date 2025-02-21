import Coupon from "../models/couponSchema.js";
import Order from "../models/order.js";

export const getcoupon = async (req, res) => {
    try {
      const coupons = await Coupon.find();
      res.render('admin/coupons', { coupons });
    } catch (err) {
      res.status(500).json({ message: 'Error fetching coupons' });
    }
  };

  export const addcoupon = async (req, res) => {
    try {
      // Validate required fields
      if (!req.body.code || !req.body.discountType || !req.body.value || !req.body.expirationDate) {
        return res.status(400).json({ message: "All fields are required" });
      }
  
      // Check if a coupon with the same code (case insensitive) already exists
      const existingCoupon = await Coupon.findOne({
        code: { $regex: new RegExp(`^${req.body.code}$`, 'i') } // Case-insensitive search
      });
  
      if (existingCoupon) {
        return res.status(400).json({ message: `Coupon with the code "${req.body.code}" already exists!` });
      }
  
      // Create and save the new coupon
      const newCoupon = new Coupon({
        code: req.body.code,
        discountType: req.body.discountType,
        value: req.body.value,
        expirationDate: req.body.expirationDate,
        usageLimit: req.body.usageLimit || 1,
        usedCount: req.body.usedCount || 0,
        minOrderAmount: req.body.minOrderAmount || 0,
      });
  
      await newCoupon.save();
  
     
      res.status(200).json({ message: 'Coupon created successfully', coupon: newCoupon });
  
    } catch (err) {
      res.status(500).json({ message: 'Error creating coupon', error: err.message });
    }
  };
  export const removecoupon = async (req, res) => {
    try {
      const couponId = req.params.id;
  
      const deleteCoupon = await Coupon.findByIdAndDelete(couponId);
      
      if (!deleteCoupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
  
      return res.status(200).json({ message: "Coupon deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting coupon', error: error.message });
    }
  };

  export const editCouponForm = async (req, res) => {
    try {
        const couponId = req.params.id;

     
        const coupon = await Coupon.findById(couponId);
        
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

       
        res.render('admin/editCoupon', { coupon });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching coupon details', error: err.message });
    }
};
export const editCoupon = async (req, res) => {
    try {
      const { code, discountType, value, expirationDate, usageLimit, minOrderAmount } = req.body;
      const couponId = req.params.id; 
  
      if (!code || !discountType || !value || !expirationDate) {
        return res.status(400).json({ message: "All fields are required" });
      }
  
      
      const existingCoupon = await Coupon.findOne({
        _id: { $ne: couponId }, 
        code: { $regex: new RegExp('^' + code + '$', 'i') } 
      });
  
      if (existingCoupon) {
        return res.status(400).json({ message: `Coupon code '${code}' already exists. Please choose a different code.` });
      }
  
      const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, {
        code,
        discountType,
        value,
        expirationDate,
        usageLimit,
        minOrderAmount
      }, { new: true });
  
      if (!updatedCoupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
  
      res.status(200).json({ message: 'Coupon updated successfully', coupon: updatedCoupon });
    } catch (err) {
      console.error(err); 
      res.status(500).json({ message: 'Error updating coupon', error: err.message });
    }
  };
  