import Order from '../models/order.js';

export const salesreportget = async (req, res) => {
    try {
        let { filter, startDate, endDate } = req.query;
        let matchCondition = { status: "Delivered" };
        const now = new Date();

        if (filter === "daily") {
            matchCondition.createdAt = {
                $gte: new Date(now.setHours(0, 0, 0, 0)),
                $lt: new Date(now.setHours(23, 59, 59, 999)),
            };
        } else if (filter === "weekly") {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            matchCondition.createdAt = { $gte: startOfWeek };
        }else if (filter === "monthly") {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of the month
            matchCondition.createdAt = { $gte: startOfMonth, $lt: endOfMonth };
        
        
        } else if (filter === "yearly") {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            matchCondition.createdAt = { $gte: startOfYear };
        } else if (filter === "custom" && startDate && endDate) {
            matchCondition.createdAt = {
                $gte: new Date(startDate),
                $lt: new Date(endDate),
            };
        }

        
        const salesData = await Order.aggregate([
            { $match: matchCondition },
            { $unwind: "$items" }, 
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$items.totalprice" }, 
                    totalOrders: { $sum: 1 }, 
                    totalProductsSold: { $sum: "$items.quantity" } 
                },
            },
        ]);

       
        const lastWeekStart = new Date();
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = new Date();

        const lastWeekProducts = await Order.aggregate([
            { $match: { createdAt: { $gte: lastWeekStart, $lt: lastWeekEnd }, status: "Delivered" } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: null,
                    lastWeekProductCount: { $sum: "$items.quantity" }
                }
            }
        ]);
        console.log(lastWeekProducts);
       
        

        res.json({
            totalSales: salesData[0]?.totalSales || 0,
            totalOrders: salesData[0]?.totalOrders || 0,
            totalProductsSold: salesData[0]?.totalProductsSold || 0,
            lastWeekProductCount: lastWeekProducts[0]?.lastWeekProductCount || 0
        });

    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
