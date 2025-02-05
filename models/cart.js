import mongoose  from "mongoose";

 const cartSchema= new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    items:[
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
            size: { type: String, required: true }, 
            quantity: { type: Number, required: true, default: 1 }

        }  
    ]
 },{timestamps:true})


 const cart = mongoose.model("Cart",cartSchema);
 export default cart