import mongoose from "mongoose";
const addressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    addressType: { type: String, enum: ["Home", "Work", "Other"], required: true },  
}, { timestamps: true });

const Address=mongoose.model('Address',addressSchema);
export default Address;