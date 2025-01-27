// models/product.js
import mongoose from 'mongoose';

const sizeVariationSchema = new mongoose.Schema({
  size: { type: String, required: true },
  stock: { type: Number, required: true },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true 
  },
  images: { 
    type: [String], 
    default: [] 
  },
  sizeS: { type: Number, default: 0 },
  sizeM: { type: Number, default: 0 },
  sizeL: { type: Number, default: 0 },
  sizeXL: { type: Number, default: 0 },
  sizeXXL: { type: Number, default: 0 },
  totalStock: { type: Number, default: 0 }
});

const Product = mongoose.model('Product', productSchema);
export default Product;
