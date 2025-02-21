import mongoose from "mongoose";

const couponschema= new mongoose.Schema({
    code:{type:String,required:true,unique:true},
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
  value: { type: Number, required: true },
  expirationDate: { type: Date, required: true },
  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  minOrderAmount: { type: Number, default: 0 },
  usedByUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] 

},{ timestamps: true })



const Coupon = mongoose.model("Coupon",couponschema);
export default Coupon;