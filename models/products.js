
import mongoose from 'mongoose';


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
  totalStock: { type: Number, default: 0 },
  isdelete:{type:Boolean,default:false} ,
  isOfferActive:{type:Boolean,default:false},
  Offerprice:{type:Number},
  discountPercentage:{type:Number},
  offerType:{type:String,enum:["product","category"],default:null}

},{ timestamps: true });  

const Product = mongoose.model('Product', productSchema);
export default Product;
