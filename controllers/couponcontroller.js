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
      if (!req.body.code || !req.body.discountType || !req.body.value || !req.body.expirationDate || !req.body.minOrderAmount || !req.body.startDate) {
        return res.status(400).json({ message: "All fields are required" });
      }
  
      if (req.body.discountType === "percentage") {
        if (req.body.value < 1) {
          return res.status(400).json({ message: 'Percentage discount must be greater than 1%.' });
        }
        if (req.body.value > 70) {
          return res.status(400).json({ message: 'Percentage discount must be less than or equal to 70%.' });
        }
      } else if (req.body.discountType === "flat") {
        if (req.body.value <= 0) {
          return res.status(400).json({ message: "Flat offer value must be a positive number" });
        } else if (req.body.value >= 10000) {
          return res.status(400).json({ message: "Flat coupon price must be less than 10000" });
        }
      }
  
      const startDate = new Date(req.body.startDate);
      const expirationDate = new Date(req.body.expirationDate);
      const currentDate = new Date();
  
      // Strip time part for comparison (set hours, minutes, seconds, and milliseconds to zero)
      currentDate.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      expirationDate.setHours(0, 0, 0, 0);
  
      // Check if startDate is in the past
      if (startDate < currentDate) {
        return res.status(400).json({ message: "Start date cannot be in the past" });
      }
  
      // Check if startDate is before expirationDate
      if (startDate >= expirationDate) {
        return res.status(400).json({ message: "Start date must be before the expiration date" });
      }
  
      // If start date is valid, create the coupon
      const existingCoupon = await Coupon.findOne({
        code: { $regex: new RegExp(`^${req.body.code}$`, 'i') }
      });
  
      if (existingCoupon) {
        return res.status(400).json({ message: `Coupon with the code "${req.body.code}" already exists!` });
      }
  
      const newCoupon = new Coupon({
        code: req.body.code,
        discountType: req.body.discountType,
        value: req.body.value,
        startDate: req.body.startDate,
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
    const { code, discountType, value, expirationDate, usageLimit, minOrderAmount, startDate } = req.body;
    const couponId = req.params.id;

    if (!code || !discountType || !value || !expirationDate || !startDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (discountType === "percentage") {
      if (value < 1) {
        return res.status(400).json({ message: 'Percentage discount must be greater than 1%.' });
      }
      if (value > 70) {
        return res.status(400).json({ message: 'Percentage discount must be less than or equal to 70%.' });
      }
    } else if (discountType === "flat") {
      if (value <= 0) {
        return res.status(400).json({ message: "Flat offer value must be a positive number" });
      }
      if (value >= 10000) {
        return res.status(400).json({ message: "Flat coupon price must be less than 10000" });
      }
    }

    const currentDate = new Date();
    const startDateObj = new Date(startDate);
    const expirationDateObj = new Date(expirationDate);


    currentDate.setHours(0, 0, 0, 0);
    startDateObj.setHours(0, 0, 0, 0);
    expirationDateObj.setHours(0, 0, 0, 0);

  
    if (startDateObj < currentDate) {
      return res.status(400).json({ message: "Start date cannot be in the past" });
    }


    if (startDateObj >= expirationDateObj) {
      return res.status(400).json({ message: "Start date must be before the expiration date" });
    }


    if (startDateObj.toISOString().split('T')[0] === currentDate.toISOString().split('T')[0]) {
      req.body.startDate = currentDate.toISOString().split('T')[0];
    } else {
      req.body.startDate = startDateObj.toISOString().split('T')[0];
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
      startDate: req.body.startDate,  
      expirationDate: expirationDateObj,
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
