import Coupon from "../models/couponSchema.js";


export const getcoupon = async (req, res) => {
  try {
    // Get page and limit from query params, with default values
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10 per page

    const skip = (page - 1) * limit;

    // Fetch total number of coupons for pagination calculation
    const totalCoupons = await Coupon.countDocuments();

  
    const coupons = await Coupon.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); 

    const totalPages = Math.ceil(totalCoupons / limit);

    res.render("admin/coupons", { 
      coupons,
      currentPage: page,
      totalPages,
      totalCoupons
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching coupons", error: err.message });
  }
};

export const addcoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      value,
      expirationDate,
      minOrderAmount,
      startDate,
      usageLimit,
      usedCount,
    } = req.body;

    
    if (
      !code ||
      !discountType ||
      !value ||
      !expirationDate ||
      !minOrderAmount ||
      !startDate
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (discountType === "percentage") {
      if (value < 1) {
        return res
          .status(400)
          .json({ message: "Percentage discount must be greater than 1%." });
      }
      if (value > 70) {
        return res
          .status(400)
          .json({
            message: "Percentage discount must be less than or equal to 70%.",
          });
      }

      const maxAllowedDiscount = minOrderAmount * 0.7; 
      const calculatedDiscount = (value / 100) * minOrderAmount;

      if (calculatedDiscount > maxAllowedDiscount) {
        return res.status(400).json({
          message: `Percentage discount is too high for the minimum order amount. Maximum allowed discount is ${maxAllowedDiscount}`,
        });
      }
    } else if (discountType === "flat") {
      if (value <= 0) {
        return res
          .status(400)
          .json({ message: "Flat offer value must be a positive number" });
      }
      if (value >= 10000) {
        return res
          .status(400)
          .json({ message: "Flat coupon price must be less than 10000" });
      }

  
      if (value >= minOrderAmount) {
        return res.status(400).json({
          message:
            "Flat discount value must be less than the minimum order amount",
        });
      }
    }

 
    const start = new Date(startDate);
    const expire = new Date(expirationDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    expire.setHours(0, 0, 0, 0);

    if (start < now) {
      return res
        .status(400)
        .json({ message: "Start date cannot be in the past" });
    }

    if (start >= expire) {
      return res
        .status(400)
        .json({ message: "Start date must be before the expiration date" });
    }


    const existingCoupon = await Coupon.findOne({
      code: { $regex: new RegExp(`^${code}$`, "i") },
    });

    if (existingCoupon) {
      return res.status(400).json({
        message: `Coupon with the code "${code}" already exists!`,
      });
    }

 
    const newCoupon = new Coupon({
      code,
      discountType,
      value,
      startDate,
      expirationDate,
      usageLimit: usageLimit || 1,
      usedCount: usedCount || 0,
      minOrderAmount,
    });

    await newCoupon.save();

    res
      .status(200)
      .json({ message: "Coupon created successfully", coupon: newCoupon });
  } catch (err) {
    console.error("Error creating coupon:", err);
    res
      .status(500)
      .json({ message: "Error creating coupon", error: err.message });
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
    res
      .status(500)
      .json({ message: "Error deleting coupon", error: error.message });
  }
};

export const editCouponForm = async (req, res) => {
  try {
    const couponId = req.params.id;

    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.render("admin/editCoupon", { coupon });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching coupon details", error: err.message });
  }
};

export const editCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      value,
      expirationDate,
      usageLimit,
      minOrderAmount,
      startDate,
    } = req.body;
    const couponId = req.params.id;

    if (!code || !discountType || !value || !expirationDate || !startDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (discountType === "percentage") {
      if (value < 1) {
        return res
          .status(400)
          .json({ message: "Percentage discount must be greater than 1%." });
      }
      if (value > 70) {
        return res
          .status(400)
          .json({
            message: "Percentage discount must be less than or equal to 70%.",
          });
      }
    } else if (discountType === "flat") {
      if (value <= 0) {
        return res
          .status(400)
          .json({ message: "Flat offer value must be a positive number" });
      }
      if (value >= 10000) {
        return res
          .status(400)
          .json({ message: "Flat coupon price must be less than 10000" });
      }
    }

    const currentDate = new Date();
    const startDateObj = new Date(startDate);
    const expirationDateObj = new Date(expirationDate);

    currentDate.setHours(0, 0, 0, 0);
    startDateObj.setHours(0, 0, 0, 0);
    expirationDateObj.setHours(0, 0, 0, 0);

    if (startDateObj < currentDate) {
      return res
        .status(400)
        .json({ message: "Start date cannot be in the past" });
    }

    if (startDateObj >= expirationDateObj) {
      return res
        .status(400)
        .json({ message: "Start date must be before the expiration date" });
    }

    if (
      startDateObj.toISOString().split("T")[0] ===
      currentDate.toISOString().split("T")[0]
    ) {
      req.body.startDate = currentDate.toISOString().split("T")[0];
    } else {
      req.body.startDate = startDateObj.toISOString().split("T")[0];
    }

    const existingCoupon = await Coupon.findOne({
      _id: { $ne: couponId },
      code: { $regex: new RegExp("^" + code + "$", "i") },
    });

    if (existingCoupon) {
      return res    
        .status(400)
        .json({
          message: `Coupon code '${code}' already exists. Please choose a different code.`,
        });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        code,
        discountType,
        value,
        startDate: req.body.startDate,
        expirationDate: expirationDateObj,
        usageLimit,
        minOrderAmount,
      },
      { new: true }
    );

    if (!updatedCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res
      .status(200)
      .json({ message: "Coupon updated successfully", coupon: updatedCoupon });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error updating coupon", error: err.message });
  }
};
