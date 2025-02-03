import mongoose from 'mongoose';
import { type } from 'os';

const userSchema = new mongoose.Schema({
  fname: {
    type: String,
    required: false,
  },
  lname: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: true,
    unique: true, 
  },
  password: {
    type: String,
    required: false,
  },
  otp: {
     type: Number 
  },
  verified: { 
    type: Boolean, 
    default: false 
  }, 
  googleId: {
    type: String,
    unique: true,
  },
  displayName: {
    type: String,
  },
  profileImage: {
    type: String,
  },
  blocked: {
    type: Boolean,
    default: false,  
  },
  dob: { type: Date },
  gender:{type:String ,enum: ['male', 'female', 'other'] },
}, { timestamps: true });

export default mongoose.model("User", userSchema);

