import mongoose from 'mongoose';

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
    default: false,  // Default to false, meaning users are not blocked by default
  },
}, { timestamps: true });

export default mongoose.model("User", userSchema);

