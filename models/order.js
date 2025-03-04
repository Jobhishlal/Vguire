import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
            size: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true } ,
            totalprice:{type:Number,required:true},
            rating: { type: Number, min: 1, max: 5, default: null } 
        }
    ],
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
    totalAmount: { type: Number, required: true },
    appliedCoupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
    paymentMethod: { type: String, enum: ["COD", "UPI", "Card", "Wallet"], required: true },
    paymentStatus: { type: String, required: true, default: "Pending" },
    transactionId: { type: String, default: null },  
    status: { type: String, enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"], default: "Pending" },
    estimatedDelivery: { type: Date },
    trackingNumber: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deliveryDate: { type: Date },
}, { timestamps: true });

const order= mongoose.model("Order",orderSchema);
export default order;
