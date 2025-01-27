import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const adminSchema = new mongoose.Schema({
    email: { 
        type: String,
         required: true,
          unique: true 
        },
    password: { 
        type: String, 
        required: true 
    },
    Adminname: { 
        type: String, 
        required: true 
    },
    image:{
        type:String,
        required:false
    }
  });
  
  
  adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
      return next();
    }
    this.password = await bcrypt.hash(this.password, 10); 
    next();
  });
  

  adminSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };
  const Admin = mongoose.model('Admin', adminSchema);
  export default Admin;