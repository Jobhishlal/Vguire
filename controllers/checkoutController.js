import Cart from '../models/cart.js';
import Product from '../models/products.js';
import Address from '../models/address.js';
import Order from '../models/order.js';
export const singlecheckout = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user._id;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Product not found");

        const addresses = await Address.find({ userId });

        res.render("user/checkout", {
            items: [{ product, quantity, price: product.price }],
            addresses,
            totalAmount: product.price * parseInt(quantity),
            currentCheckoutUrl: `/user/checkout/single?productId=${productId}&quantity=${quantity}` 
        });
    } catch (error) {
        console.error("Checkout Error:", error);
        res.status(500).send("Server Error");
    }
};



export const buyNowCartView = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart || cart.items.length === 0) {
            return res.redirect("/cart");
        }

        const addresses = await Address.find({ userId });
        const totalAmount = cart.items.reduce((total, item) => total + (item.productId.price * item.quantity), 0);

        res.render("user/checkout", {
            items: cart.items.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.productId.price
            })),
            addresses,
            totalAmount,
            currentCheckoutUrl: "/user/checkout" 
        });
    } catch (error) {
        console.error("Checkout Error:", error);
        res.status(500).send("Server Error");
    }
};


  
export const cartproduct = async (req,res)=>{
    try {
        const userId= req.user._id;
        const cart = await Cart.findOne({userId}).populate("items.productId");
        if(!cart||cart.items.length===0){
            return res.redirect("/user/cart")

        }
        const address = await Address.findOne({userId});
        const totalAmount=cart.items.reduce((total,itme)=>total+(items.productId.price*items.quantity),0);
        res.render("user/checkout", {
            items: cart.items.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.productId.price
            })),
            address,
            totalAmount
        });
    } catch (error) {
        console.error("cart checkout error",error);
        return res.status(500).send("its an checkout error")
    }
}

export const placeorder = async (req, res) => {
    try {
      const { addressId } = req.body;
      console.log("i am address",addressId);
       
      const userId = req.user._id;
  
     
      const items = req.body.items; 
      
      
      const paymentMethod = req.body.paymentMethod || "COD";
  
      const newOrder = new Order({
        userId,
        items,
        addressId,            
        paymentMethod,        
        status: "Pending"
      });
  
      await newOrder.save();
      res.redirect("/user/orders");
    } catch (error) {
      console.error("Order Placement Error:", error);
      res.status(500).send("Server Error");
    }
  };
  export const addaddress = async (req, res) => {
    try {
        const addressData = req.body;
        addressData.userId = req.user._id;
        const newAddress = new Address(addressData);
        await newAddress.save();

        const redirectUrl = req.body.redirectUrl || "/user/checkout";  // ✅ Use req.body.redirectUrl
        return res.redirect(redirectUrl);
    } catch (error) {
        console.error("Address Addition Error:", error);
        return res.status(500).send("Error adding address");
    }
};


export const editaddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const updatedData = req.body;
        const updatedAddress = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });

        if (!updatedAddress) {
            return res.status(404).json({ success: false, error: "Address not found" });
        }

        const redirectUrl = req.body.redirectUrl || "/user/checkout"; 
        return res.redirect(redirectUrl);
    } catch (error) {
        console.error("Edit Address Error:", error);
        return res.status(500).send("Error editing address");
    }
};


export const getcheckout = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.productId");
        const addresses = await Address.find({ userId });

        if (!cart || cart.items.length === 0) {
            return res.redirect("/user/cart");
        }

        
        let totalAmount = 0;
        const updatedItems = cart.items.map(item => {
            const itemTotal = item.productId.price * item.quantity;
            totalAmount += itemTotal;

            return {
                product: item.productId,
                quantity: item.quantity,
                price: item.productId.price,
                totalPrice: itemTotal, 
                size: item.size, 
            };
        });

        res.render("user/checkout", {
            items: updatedItems,
            addresses,
            totalAmount,
            currentCheckoutUrl: "/user/checkout/buy-now-cart",
        });
    } catch (error) {
        console.error("Checkout Page Error:", error);
        res.status(500).send("Error loading checkout page");
    }
};

export const singleCheckoutView= async(req,res)=>{
    try {

        const { productId, quantity } = req.query;  
        const userId = req.user._id;

        if (!productId || !quantity) {
            return res.redirect("/user/shop");  
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).send("Product not found");

        const addresses = await Address.find({ userId });

        res.render("user/checkout", {
            items: [{ product, quantity, price: product.price }],
            addresses,
            totalAmount: product.price * parseInt(quantity),
            currentCheckoutUrl: `/user/checkout/single?productId=${productId}&quantity=${quantity}`
        });
        
    } catch (error) {
        console.error("Single Checkout Error:", error);
        res.status(500).send("Server Error");
    }
}