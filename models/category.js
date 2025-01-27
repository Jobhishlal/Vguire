
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
//   isdelete: { type: Boolean, default: false },
  isListed: { type: Boolean, default: true },
  image: { type: String }, 
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
