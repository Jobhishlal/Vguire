import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true } 
        }
    ],
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
    paymentMethod: { type: String, enum: ["COD", "UPI", "Card", "Wallet"], required: true },
    transactionId: { type: String, default: null },  
    status: { type: String, enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"], default: "Pending" },
    estimatedDelivery: { type: Date },
    trackingNumber: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const order= mongoose.model("Order",orderSchema);
export default order;
