import Order from '../models/order.js'
import Product from '../models/products.js'
import Cart from '../models/cart.js'
import flash from 'express-flash';

export const getorder = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Show 10 orders per page
        const skip = (page - 1) * limit;

        const orders = await Order.find({})
            .populate("userId", "name email")
            .populate("items.productId", "name images price")
            .populate("addressId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        // You can set success message here if needed
        const success = req.query.success || null;
        const error = req.query.error || null;

        res.render("admin/order", { 
            orders, 
            currentPage: page, 
            totalPages,
            success,
            error,
            messages: req.flash() 
        });
         
    } catch (error) {
        console.error("Admin Orders Fetch Error:", error);
        res.status(500).send("Server Error");
    }
}


export const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate("userId", "name email")
            .populate("items.productId", "name images price")
            .populate("addressId");

        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect("/admin/order");
        }

        res.render("admin/order-details", { order  });
    } catch (error) {
        console.error("Admin Order Details Error:", error);
        res.status(500).send("Server Error");
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body; 

        const order = await Order.findById(orderId);
        
        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect("/admin/order");
        }

        if (order.status === "Delivered" || order.status === "Cancelled") {
            req.flash("error", "You cannot change the status of a Delivered or Cancelled order.");
            return res.redirect(`/admin/ordermanagement/${orderId}`);
        }

        order.status = status;
        await order.save();

        req.flash("success", "Order status updated successfully.");
        res.redirect(`/admin/ordermanagement/${orderId}`);
    } catch (error) {
        console.error("Admin Order Update Error:", error);
        res.status(500).send("Server Error");
    }
};
