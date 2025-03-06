import mongoose from "mongoose";

// const orderSchema = new mongoose.Schema({
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     items: [
//         {
//             productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
//             size: { type: String, required: true },
//             quantity: { type: Number, required: true },
//             price: { type: Number, required: true } ,
//             totalprice:{type:Number,required:true},
//             rating: { type: Number, min: 1, max: 5, default: null } ,
//             status:{type:String,enum:["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],default:"Pending"},
//             cancelReason: { type: String, default: null },
//             returnRequested: { type: Boolean, default: false },
//             returnApproved: { type: Boolean, default: false },
//             returnRequestDate: { type: Date },  
//             adminApprovalDate: { type: Date }, 
            
//             returnStatus: { type: String, enum: ["None", "Requested", "Approved", "Rejected", "Completed"], default: "None" },
//             returnReason : { type: String },
//             returnRefundAmount: { type: Number, default: 0 },
//             refundedAmount: { type: Number, default: 0 }
//         }
//     ],
//     addressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
//     totalAmount: { type: Number, required: true },
//     appliedCoupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
//     refundedAmount: { type: Number, default: 0 },

//     paymentMethod: { type: String, enum: ["COD", "UPI", "Wallet"], required: true },
//     paymentStatus: {   type: String,   enum: ["Pending","Paid","Completed", "Failed", "Refunded"],  required: true,   default: "Pending" 
//     },
//     couponDetails: { 
//         code: String,
//         discountType: String,
//         value: Number,
//         discountAmount: Number
//     },
//     discountAmount: Number,
//     transactionId: { type: String, default: null },  
//     status: { type: String, enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled","Returned"], default: "Pending" },
//     estimatedDelivery: { type: Date },
//     trackingNumber: { type: String, default: null },
//     returnRequested: { type: Boolean, default: false },  
//     returnApproved: { type: Boolean, default: false },   
//     returnRequestDate: { type: Date },                   
//     adminApprovalDate: { type: Date }, 
//     returnReason : { type: String },     
//     createdAt: { type: Date, default: Date.now },
//     updatedAt: { type: Date, default: Date.now },
//     deliveryDate: { type: Date },
// }, { timestamps: true });

// const order= mongoose.model("Order",orderSchema);
// export default order;


const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
            size: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
            totalprice: { type: Number, required: true },
            rating: { type: Number, min: 1, max: 5, default: null },
            status: { 
                type: String, 
                enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"], // Added "Returned"
                default: "Pending" 
            },
            cancelReason: { type: String, default: null },
            returnRequested: { type: Boolean, default: false },
            returnApproved: { type: Boolean, default: false },
            returnRequestDate: { type: Date },
            adminApprovalDate: { type: Date },
            returnStatus: { type: String, enum: ["None", "Requested", "Approved", "Rejected", "Completed"], default: "None" },
            returnReason: { type: String },
            returnRefundAmount: { type: Number, default: 0 },
            refundedAmount: { type: Number, default: 0 }
        }
    ],
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
    totalAmount: { type: Number, required: true },
    appliedCoupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
    refundedAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["COD", "UPI", "Wallet"], required: true },
    paymentStatus: { 
        type: String,   
        enum: ["Pending", "Paid", "Completed", "Failed", "Refunded"],  
        required: true,   
        default: "Pending" 
    },
    couponDetails: { 
        code: String,
        discountType: String,
        value: Number,
        discountAmount: Number
    },
    discountAmount: Number,
    transactionId: { type: String, default: null },
    status: { type: String, enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"], default: "Pending" },
    estimatedDelivery: { type: Date },
    trackingNumber: { type: String, default: null },
    returnRequested: { type: Boolean, default: false },
    razorpayOrderId: { type: String, unique: true, sparse: true },
    returnApproved: { type: Boolean, default: false },
    returnRequestDate: { type: Date },
    adminApprovalDate: { type: Date },
    returnReason: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deliveryDate: { type: Date },
}, { timestamps: true });

const order = mongoose.model("Order", orderSchema);
export default order;
