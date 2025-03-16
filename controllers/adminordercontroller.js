import Order from '../models/order.js'
import Product from '../models/products.js'
import User from '../models/userSchema.js'
import WalletTransaction from '../models/wallet.js';


export const getorder = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 
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
            .populate("items.productId", "name images price Offerprice")
            .populate("addressId")
            .populate("appliedCoupon");

        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect("/admin/order");
        }


        let subtotal = 0;
        let totalProductDiscount = 0;

        order.items.forEach(item => {
            let productPrice = item.productId?.price || 0;
            let offerPrice = item.productId?.Offerprice ?? productPrice; 

            let finalPrice = offerPrice;
            let discountPerItem = productPrice > offerPrice ? productPrice - offerPrice : 0;
            let totalDiscountPerProduct = discountPerItem * item.quantity;

            subtotal += finalPrice * item.quantity;
            totalProductDiscount += totalDiscountPerProduct;
        });

        let couponDiscount = 0;
        if (order.appliedCoupon) {
            const coupon = order.appliedCoupon;
            if (coupon.discountType === "flat") {
                couponDiscount = coupon.discountValue;
            } else if (coupon.discountType === "percentage") {
                couponDiscount = (subtotal * coupon.discountValue) / 100;
            }
        }

        order.discountAmount = couponDiscount;
        order.totalAmount = subtotal - couponDiscount;

        res.render("admin/order-details", { 
            order,
            subtotal,
            totalProductDiscount,
            couponDiscount,
            finalTotal: order.totalAmount
        });

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
        
        // Check if payment method is UPI and payment status is Pending
        if (order.paymentMethod === "UPI" && order.paymentStatus === "Pending" && status === "Delivered") {
            req.flash("error", "This order cannot be delivered as payment is pending via UPI.");
            return res.render("admin/order-details", { 
                order, 
                error: req.flash("error"),
            });
        }

        if (order.status === "Delivered" && status === "Cancelled") {
            req.flash("error", "Delivered orders cannot be canceled.");
            return res.redirect(`/admin/ordermanagement/${orderId}`);
        }
      
        if (status === "Cancelled") {
            for (const item of order.items) {
                const product = await Product.findById(item.productId);
                if (!product) continue;

                product.totalStock += item.quantity;

                if (item.size) {
                    const sizeKey = `size${item.size.trim()}`;
                    if (product[sizeKey] !== undefined) {
                        product[sizeKey] += item.quantity;
                    } else {
                        console.warn(`Size ${sizeKey} not found in product ${item.productId}`);
                    }
                }

                await product.save(); 
            }

            order.status = "Cancelled"; 
        } else if (status === "Delivered") {
            order.status = "Delivered";
            order.items.forEach(item => {
                item.status = "Delivered"; 
            });
     
            if (order.paymentMethod === "COD") {
                order.paymentStatus = "Paid"; 
            }
        } else {
            order.status = status;
        }

        await order.save(); 

        req.flash("success", "Order status updated successfully.");
        res.redirect(`/admin/ordermanagement/${orderId}`);
    } catch (error) {
        console.error("Admin Order Update Error:", error);
        res.status(500).send("Server Error");
    }
};






export const getReturnRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 1; 
        const skip = (page - 1) * limit; 

        const totalOrders = await Order.countDocuments({
            "items": {
                $elemMatch: {
                    returnRequested: true,
                    returnApproved: { $ne: true }
                }
            }
        });

        
        const returnOrders = await Order.find({
            "items": {
                $elemMatch: {
                    returnRequested: true,
                    returnApproved: { $ne: true }
                }
            }
        })
        .populate("userId", "name email")
        .skip(skip)
        .limit(limit);

        const filteredOrders = returnOrders.map(order => ({
            ...order.toObject(),
            items: order.items.filter(item => item.returnRequested && !item.returnApproved)
        }));

        const totalPages = Math.ceil(totalOrders / limit);

        res.render("admin/returnRequests", { 
            returnOrders: filteredOrders,
            currentPage: page,
            totalPages,
            totalOrders
        });

    } catch (error) {
        console.error("Error fetching return requests:", error);
        res.status(500).send("Server Error");
    }
};








export const returnrequest = async (req, res) => {
    try {
        const { orderId, productId, action } = req.body;
        let order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

       

        // Find product in the order
        const productIndex = order.items.findIndex(item =>
            item.productId && item.productId.toString() === productId.toString()
        );


        if (productIndex === -1) {
            return res.status(404).json({ message: "Product not found in order" });
        }

        const productItem = order.items[productIndex];

     

        if (!productItem.returnStatus || (productItem.returnStatus !== "Requested" && productItem.returnStatus !== "Rejected")) {
            return res.status(400).json({ message: "Return not requested or already processed." });
        }
        

        if (action === "Approved") {
            productItem.returnApproved = true;
            productItem.returnStatus = "Approved";
            productItem.status = "Returned";
            productItem.adminApprovalDate = new Date();

            let refundAmount = 0;
            const originalOrderTotal = order.items.reduce((sum, item) => sum + (item.totalprice || 0), 0);

            // Handle discount calculations
            if (order.appliedCoupon && order.couponDetails && order.couponDetails.discountAmount) {
                const totalDiscount = order.couponDetails.discountAmount;
                const itemDiscountProportion = productItem.totalprice / originalOrderTotal;
                const itemDiscountAmount = totalDiscount * itemDiscountProportion;
                refundAmount = productItem.totalprice - itemDiscountAmount;
            } else if (order.appliedCoupon) {
                const totalDiscount = originalOrderTotal - order.totalAmount - (order.refundedAmount || 0);
                const itemDiscountProportion = productItem.totalprice / originalOrderTotal;
                const itemDiscountAmount = totalDiscount * itemDiscountProportion;
                refundAmount = productItem.totalprice - itemDiscountAmount;
            } else {
                refundAmount = productItem.totalprice;
            }

            refundAmount = Math.round(refundAmount * 100) / 100;
            productItem.returnRefundAmount = refundAmount;
            productItem.refundedAmount = refundAmount;

            // Update product stock
            const product = await Product.findById(productId);
            if (product) {
                product.totalStock += productItem.quantity;
                if (productItem.size) {
                    const sizeKey = `size${productItem.size.replace(/^size/i, "").trim().toUpperCase()}`;
                    if (product[sizeKey] !== undefined) {
                        product[sizeKey] += productItem.quantity;
                    }
                }
                await product.save();
            }

            // Update order total amount
            order.totalAmount = order.items.filter(item => item.status !== "Returned")
                .reduce((sum, item) => sum + item.totalprice, 0);
            order.totalAmount = Math.max(0, order.totalAmount);
            order.totalAmount = Math.round(order.totalAmount * 100) / 100;

            // Check if all items are returned
            const allItemsReturned = order.items.every(item => item.status === "Returned");
            if (allItemsReturned) {
                order.status = "Returned";
                order.paymentStatus = "Refunded";
            } else {
                order.status = "Delivered";
            }

            order.refundedAmount = (order.refundedAmount || 0) + refundAmount;

            // Update user wallet
            const user = await User.findById(order.userId);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + refundAmount;

                await WalletTransaction.create({
                    userId: user._id,
                    amount: refundAmount,
                    type: "Credit",
                    description: `Refund for Returned Product in Order #${order._id}`
                });

                await user.save();
            }

            await order.save();

           

            res.json({
                message: "Return approved, stock updated, and refund credited to wallet.",
                refundAmount,
                orderTotalRemaining: order.totalAmount,
                totalRefunded: order.refundedAmount,
                productStatus: productItem.status,
                orderStatus: order.status,
                productInfo: {
                    productId: productItem.productId,
                    price: productItem.price,
                    quantity: productItem.quantity,
                    totalPrice: productItem.totalprice
                },
                discountApplied: Boolean(order.appliedCoupon),
                discountAmount: order.couponDetails ? order.couponDetails.discountAmount : 0,
                userWalletBalance: user ? user.walletBalance : 0
            });

        } else if (action === "Rejected") {
            productItem.returnApproved = false;
            productItem.returnStatus = "Rejected";
            productItem.status = "Delivered";
            await order.save();

            return res.json({
                message: "Return request rejected successfully.",
                productStatus: productItem.status,
                orderStatus: order.status,
            });

        } else {
            return res.status(400).json({ message: "Invalid Action" });
        }

    } catch (error) {
        console.error("Return Approval Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


