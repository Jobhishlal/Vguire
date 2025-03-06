import Product from '../models/products.js'; 
import Order from '../models/order.js';

export const generateBrudcrumbs = async (req, res, next) => {
    const pathArray = req.path.split("/").filter(Boolean);
    let breadcrumbs = [{ name: "Home", url: "/user/home" }];
    let url = "/user";

    for (let i = 0; i < pathArray.length; i++) {
        let segment = pathArray[i];

        // If segment is a MongoDB ObjectId (24-char hex)
        if (segment.match(/^[0-9a-fA-F]{24}$/)) {
            try {
                let previousSegment = pathArray[i - 1];

                if (previousSegment === "productview") {
                    const product = await Product.findById(segment);
                    if (product) {
                        breadcrumbs.push({
                            name: product.name,
                            url: `/order-view/${segment}`
                        });
                        continue;
                    }
                }

                if (previousSegment === "order-view") {
                    const order = await Order.findById(segment);
                    if (order) {
                        breadcrumbs.push({
                            name: `Order #${order._id.toString().slice(-6)}`,
                            url: `/order-view/${segment}`
                        });
                        continue;
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }

        url += `/${segment}`;
        breadcrumbs.push({
            name: segment.charAt(0).toUpperCase() + segment.slice(1),
            url
        });
    }

    res.locals.breadcrumbs = breadcrumbs;
    next();
};
