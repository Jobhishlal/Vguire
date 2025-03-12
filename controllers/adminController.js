import Admin from "../models/admin.js";
import Order from "../models/order.js";
import User from "../models/userSchema.js";
import morgan from "morgan";

export const renderLoginPage = (req, res) => {
  res.render("admin/adminlogin", { errorMessage: "" });
};

morgan.token("login-user", (req) => `User: ${req.body.email || "Unknown"}`);
export const authenticateAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    console.log(`Failed Login: ${email || "Unknown"}`);
    return res.render("admin/adminlogin", {
      errorMessage: "Email and password are required",
    });
  }

  try {
    const admin = await Admin.findOne({ email });

    if (!admin) {
      console.log(`Failed Login: ${email}`);
      return res.render("admin/adminlogin", {
        errorMessage: "Invalid email or password",
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      console.log(`Failed Login: ${email}`);
      return res.render("admin/adminlogin", {
        errorMessage: "Invalid email or password",
      });
    }

    req.session.admin = { id: admin._id, email: admin.email };
    req.session.cookie.maxAge = 60 * 60 * 1000;

    console.log(`Successful Login: ${email}`);

    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server Error");
  }
};

// export const renderDashboard = async (req, res) => {
//     try {
//         if (!req.session.admin) {
//             return res.redirect('/admin/login');
//         }

//         const admin = await Admin.findById(req.session.admin.id);
//         if (!admin) {
//             return res.status(404).send('Admin not found');
//         }
//         const pendingOrdersCount = await Order.countDocuments({ status: "Pending" });
//         const totalUsersCount = await User.countDocuments();
//         const salesData = await Order.aggregate([
//                     { $match: { status: "Delivered" } },
//                        { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } }
//            ]);
//                const totalSales = salesData.length > 0 ? salesData[0].totalSales : 0;

//                const discountData = await Order.aggregate([
//                 { $match: { status: "Delivered" } },
//                 { $group: { _id: null, totalCouponDiscount: { $sum: "$couponDiscount" || 0 } } }
//             ]);
//             const totalCouponDiscount = discountData.length > 0 ? discountData[0].totalCouponDiscount : 0;

//             const totalOrders = await Order.countDocuments();

//             const productsSoldData = await Order.aggregate([
//                 { $match: { status: "Delivered" } },
//                 { $unwind: "$items" },
//                 { $group: { _id: null, totalProductsSold: { $sum: "$items.quantity" } } }
//             ]);
//             const totalProductsSold = productsSoldData.length > 0 ? productsSoldData[0].totalProductsSold : 0;

//         res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
//         res.setHeader('Pragma', 'no-cache');
//         res.setHeader('Expires', '0');

//         res.render('admin/dashboard', { admin,pendingOrdersCount,totalUsersCount,totalSales,totalCouponDiscount ,totalOrders,totalProductsSold});

//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// };

export const renderDashboard = async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }

    const admin = await Admin.findById(req.session.admin.id);
    if (!admin) {
      return res.status(404).send("Admin not found");
    }

    const totalUsersCount = await User.countDocuments();
    const pendingOrdersCount = await Order.countDocuments({
      status: "Pending",
    });

    const salesData = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
    ]);
    const totalSales = salesData.length > 0 ? salesData[0].totalSales : 0;

    const discountData = await Order.aggregate([
      { $match: { status: "Delivered" } },
      {
        $group: {
          _id: null,
          totalCouponDiscount: { $sum: "$couponDiscount" || 0 },
        },
      },
    ]);
    const totalCouponDiscount =
      discountData.length > 0 ? discountData[0].totalCouponDiscount : 0;

    const totalOrders = await Order.countDocuments();

    const productsSoldData = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: "$items" },
      { $group: { _id: null, totalProductsSold: { $sum: "$items.quantity" } } },
    ]);
    const totalProductsSold =
      productsSoldData.length > 0 ? productsSoldData[0].totalProductsSold : 0;

    const orders = (await Order.find({ status: "Delivered" }).lean()).map(
      (order) => ({
        "Order ID": order._id.toString(),
        "Total Items": order.items
          ? order.items.reduce((sum, item) => sum + item.quantity, 0)
          : 0,
        "Total Amount": order.totalAmount || 0,
        "Discount Applied": order.discount || 0,
        "Coupon Discount": order.couponDiscount || 0,
        "Final Amount": order.finalAmount || order.totalAmount,
        "Payment Method": order.paymentMethod || "Unknown",
        "Order Status": order.status,
      })
    );

    const topProducts = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalOrders: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalOrders: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
    ]);

    const topCategories = await Order.aggregate([
      { $match: { status: "Delivered" } }, 
      { $unwind: "$items" }, 
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" }, 
      {
        $group: {
          _id: "$productDetails.category", 
          totalOrders: { $sum: 1 }, 
          totalAmount: { $sum: "$totalAmount" }, 
        },
      },
      { $sort: { totalOrders: -1 } }, 
      { $limit: 10 }, 
      {
        $lookup: {
          from: "categories", 
          localField: "_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" }, 
      {
        $project: {
          _id: 0,
          name: "$categoryDetails.name",
          image: "$categoryDetails.image",
          totalOrders: 1,
          totalAmount: 1,
        },
      },
    ]);

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.render("admin/dashboard", {
      admin,
      totalUsersCount,
      pendingOrdersCount,
      totalSales,
      totalCouponDiscount,
      totalOrders,
      totalProductsSold,
      orders,
      topProducts,
      topCategories,
    });
  } catch (err) {
    console.error("Error rendering dashboard:", err);
    res.status(500).send("Server Error");
  }
};

export const logoutAdmin = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Server Error");
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.redirect("/admin/login");
  });
};
