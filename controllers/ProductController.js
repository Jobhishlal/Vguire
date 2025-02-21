import mongoose from 'mongoose';
import Product from '../models/products.js'; 
import Category from '../models/category.js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { error } from 'console';
import flash from 'express-flash';


export const showProducts = async (req, res) => {
    try {
        const products = await Product.find().populate('category');

        
        const productsWithCroppedImages = products.map(product => ({
            ...product._doc,
            croppedImages: product.images.map(image => {
                const filename = path.basename(image); 
                return `/uploads/products/cropped-${filename}`;
            })
        }));

        res.render('admin/product', { products: productsWithCroppedImages ,messages:{
            success:req.flash("success"),
            error:req.flash("error")
        }});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving products');
    }
};


export const getproduct = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('admin/add-product', { categories ,messages:{
            success:req.flash("success"),
            error:req.flash("error")
            
        }});
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Failed to fetch categories.');
    }
};


export const addProduct = async (req, res) => {
    try {
        const { name, description, price, category, sizeS, sizeM, sizeL, sizeXL, sizeXXL, imageBase64 } = req.body;

        if (!name || !price || !category || (!imageBase64 && (!req.files || req.files.length === 0))) {
           req.flash("error","all fields are required");
           return res.redirect("/admin/add-product")
        }

      
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            req.flash("error",'Invalid category selected')
            return res.redirect("/admin/add-product")
        }

        let imagePaths = [];
        let croppedImagePaths = [];

       
        if (imageBase64) {
            const base64Data = imageBase64.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const imageName = `product-${uniqueId}.jpg`;
            const croppedImageName = `cropped-${uniqueId}.jpg`;

            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            
            const fullImagePath = path.join(uploadDir, imageName);
            await fs.promises.writeFile(fullImagePath, buffer);
            imagePaths.push(`/uploads/products/${imageName}`);

            const croppedImagePath = path.join(uploadDir, croppedImageName);
            await sharp(buffer)
                .resize(500, 500)  
                .toFile(croppedImagePath);
            croppedImagePaths.push(`/uploads/products/${croppedImageName}`);
        }


        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const originalPath = `/uploads/products/${file.filename}`;
                imagePaths.push(originalPath);

             
                const croppedPath = `/uploads/products/cropped-${file.filename}`;
                await sharp(file.path)
                    .resize(500, 500)  
                    .toFile(`public${croppedPath}`);
                croppedImagePaths.push(croppedPath);
            }
        }

        console.log('Full image paths:', imagePaths); 
        console.log('Cropped image paths:', croppedImagePaths);  

  
        const sizes = [sizeS, sizeM, sizeL, sizeXL, sizeXXL].map(size => parseInt(size) || 0);
        const totalStock = sizes.reduce((acc, size) => acc + size, 0);

      
        const newProduct = new Product({
            name,
            description,
            price,
            category,
            images: croppedImagePaths, 
            sizeS: sizes[0],
            sizeM: sizes[1],
            sizeL: sizes[2],
            sizeXL: sizes[3],
            sizeXXL: sizes[4],
            totalStock
        });

        await newProduct.save();

        req.flash('success', 'Product added successfully');
        res.redirect('/admin/product');
    } catch (error) {
       req.flash("error","server error")
      return res.redirect("/admin/add-product")
    }
};




export const getEditProduct = async (req, res) => {
    console.log("Edit product route hit.");
    const { id } = req.params;

    // Validate ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log("Invalid Product ID:", id);
        return res.status(400).send('Invalid Product ID');
    }

    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        const categories = await Category.find();
        res.render('admin/edit-product', { 
            product, 
            categories,
            messages: {
                success: req.flash("success") || [],
                error: req.flash("error") || []
            }
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).send('Failed to fetch product details.');
    }
};



export const deleteimage = async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            req.flash("error", 'Image URL is required')
            return res.redirect(`/admin/edit-product/${id}`);

        }

      
        const product = await Product.findOne({ images: imageUrl });
        if (!product) {
            req.flash("error","Product not found with this image");
            return res.redirect(`/admin/edit-product/${id}`);

           
        }

      
        const imageExists = product.images.includes(imageUrl);
        if (imageExists) {
            product.images = product.images.filter(image => image !== imageUrl);
        } else {
            req.flash("error",'Image not found in product images')
            return res.redirect(`/admin/edit-product/${id}`);

        }

        await product.save();

    
        const imagePath = path.join(process.cwd(), 'public', imageUrl);
        try {
           
            await fs.promises.access(imagePath, fs.constants.F_OK); 
            await fs.promises.unlink(imagePath); 
            console.log(`Image deleted: ${imagePath}`);
        } catch (err) {
            
            console.warn(`Image not found on server, skipping deletion: ${imagePath}`, err);
            req.flash("error","Image not found on server")
            return res.redirect(`/admin/edit-product/${id}`);

        }

 
        req.flash("success",'Image deleted successfully');
        
    } catch (error) {
        console.error('Error deleting image:', error);
        
        req.flash("error","An error occurred while deleting the image.")
    }
};

// export const postEditProduct = async (req, res) => {
//     try {
//         console.log('hiiiiiiiiiiiiiiiii');
        
//         const { id } = req.params;
//         const { name, description, price, category, sizeS, sizeM, sizeL, sizeXL, sizeXXL, imageBase64, deleteCurrentImage 
//         } = req.body;
//         console.log(req.body);
        

//         if (!name || !price || !category) {
//             req.flash("error","all fields are required");
//             return res.redirect(`/admin/edit-product/${id}`);

//         }

//         const categoryExists = await Category.findById(category);
//         if (!categoryExists) {
//            req.flash("error","invalid category choose");
//            return res.redirect(`/admin/edit-product/${id}`);

//         }

//         const product = await Product.findById(id);
//         if (!product) {
//            req.flash("error","prodouct not found")
//            return res.redirect(`/admin/edit-product/${id}`);

//         }

//         let imagePaths = [];
//         let croppedImagePaths = [];


//         if (deleteCurrentImage === 'true' && product.images.length > 0) {
            
//             for (let image of product.images) {
//                 const imagePath = path.join(process.cwd(), 'public', image);
//                 try {
//                     await fs.promises.access(imagePath);
//                     await fs.promises.unlink(imagePath);
//                 } catch (err) {
//                     console.error(`Error deleting image: ${imagePath}`, err);
//                 }
                
//             }
//             product.images = []; 
//         }

       
//         if (imageBase64) {
//             const base64Data = imageBase64.split(',')[1];
//             const buffer = Buffer.from(base64Data, 'base64');
//             const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//             const imageName = `product-${uniqueId}.jpg`;
//             const croppedImageName = `cropped-${uniqueId}.jpg`;

//             const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
//             if (!fs.existsSync(uploadDir)) {
//                 await fs.promises.mkdir(uploadDir, { recursive: true });
//             }

           
//             const fullImagePath = path.join(uploadDir, imageName);
//             await fs.promises.writeFile(fullImagePath, buffer);
//             imagePaths.push(`/uploads/products/${imageName}`);

//             const croppedImagePath = path.join(uploadDir, croppedImageName);
//             try {
//                 await sharp(buffer)
//                     .resize(500, 500) 
//                     .toFile(croppedImagePath);
//                 croppedImagePaths.push(`/uploads/products/${croppedImageName}`);
//             } catch (error) {
//                 console.error('Error processing cropped image:', error);
//                 return res.status(500).json({ error: 'Failed to process cropped image' });
//             }
//         }

        
//         if (req.files && req.files.length > 0) {
//             for (const file of req.files) {
//                 const originalPath = `/uploads/products/${file.filename}`;
//                 imagePaths.push(originalPath);

//                 const croppedPath = `/uploads/products/cropped-${file.filename}`;
//                 try {
//                     await sharp(file.path)
//                         .resize(500, 500) 
//                         .toFile(`public${croppedPath}`);
//                     croppedImagePaths.push(croppedPath);
//                 } catch (error) {
//                     console.error('Error processing cropped image:', error);
//                     req.flash("error","Failed to process cropped image")
//                   return res.redirect("/admin/edit-product/:id")
//                 }
//             }
//         }

//         const finalImagePaths = croppedImagePaths.length > 0 ? [...product.images, ...croppedImagePaths] : product.images;

//         const sizes = [sizeS, sizeM, sizeL, sizeXL, sizeXXL].map(size => parseInt(size) || 0);
//         const totalStock = sizes.reduce((acc, size) => acc + size, 0);

    
//         product.name = name;
//         product.description = description;
//         product.price = price;
//         product.category = category;
//         product.images = finalImagePaths;  
//         product.sizeS = sizes[0];
//         product.sizeM = sizes[1];
//         product.sizeL = sizes[2];
//         product.sizeXL = sizes[3];
//         product.sizeXXL = sizes[4];
//         product.totalStock = totalStock;
//         console.log("Stock Data Received:", { sizeS, sizeM, sizeL, sizeXL, sizeXXL, totalStock });


//         await product.save();  

//         req.flash('success', 'Product updated successfully');
//         res.redirect('/admin/product');
//     } catch (error) {
//         console.error('Error updating product:', error);
//         res.status(500).json({ error: 'Failed to update product. Please try again.' });
//     }
// };



export const postEditProduct = async (req, res) => {
    try {
        console.log("Product Edit Request Received");

        const { id } = req.params;
        const { name, description, price, category, sizeS, sizeM, sizeL, sizeXL, sizeXXL, imageBase64, deleteCurrentImage } = req.body;
        console.log(req.body);

        if (!name || !price || !category || !description) {
            req.flash("error", "All fields are required");
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(category)) {
            req.flash("error", "Invalid category chosen");
            return res.status(400).json({ message: "Invalid category chosen" });
        }

        const product = await Product.findById(id);
        if (!product) {
            req.flash("error", "Product not found");
            return res.status(404).json({ message: "Product not found" });
        }

        let imagePaths = [];
        let croppedImagePaths = [];

        if (deleteCurrentImage === "true" && product.images.length > 0) {
            for (let image of product.images) {
                const imagePath = path.join(process.cwd(), "public", image);
                try {
                    await fs.promises.access(imagePath);
                    await fs.promises.unlink(imagePath);
                } catch (err) {
                    console.error(`Error deleting image: ${imagePath}`, err);
                }
            }
            product.images = [];
        }

        if (imageBase64 && imageBase64.startsWith("data:image")) {
            const base64Data = imageBase64.split(",")[1];
            const buffer = Buffer.from(base64Data, "base64");
            const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const imageName = `product-${uniqueId}.jpg`;
            const croppedImageName = `cropped-${uniqueId}.jpg`;

            const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
            if (!fs.existsSync(uploadDir)) {
                await fs.promises.mkdir(uploadDir, { recursive: true });
            }

            const fullImagePath = path.join(uploadDir, imageName);
            await fs.promises.writeFile(fullImagePath, buffer);
            imagePaths.push(`/uploads/products/${imageName}`);

            try {
                await sharp(buffer).resize(500, 500).toFile(path.join(uploadDir, croppedImageName));
                croppedImagePaths.push(`/uploads/products/${croppedImageName}`);
            } catch (error) {
                console.error("Error processing cropped image:", error);
                req.flash("error", "Failed to process cropped image");
                return res.status(500).json({ message: "Failed to process cropped image" });
            }
        }

        if (Array.isArray(req.files) && req.files.length > 0) {
            for (const file of req.files) {
                const originalPath = `/uploads/products/${file.filename}`;
                imagePaths.push(originalPath);

                try {
                    await sharp(file.path).resize(500, 500).toFile(`public/uploads/products/cropped-${file.filename}`);
                    croppedImagePaths.push(`/uploads/products/cropped-${file.filename}`);
                } catch (error) {
                    console.error("Error processing cropped image:", error);
                    req.flash("error", "Failed to process cropped image");
                    return res.status(500).json({ message: "Failed to process cropped image" });
                }
            }
        }

        const finalImagePaths = croppedImagePaths.length > 0 ? [...product.images, ...croppedImagePaths] : product.images;

        const sizes = [sizeS, sizeM, sizeL, sizeXL, sizeXXL].map(size => Number(size) || 0);
        const totalStock = sizes.reduce((acc, size) => acc + size, 0);
        console.log("Stock Data Received:", { sizeS, sizeM, sizeL, sizeXL, sizeXXL, totalStock });

        product.name = name;
        product.description = description;
        product.price = price;
        product.category = category;
        product.images = finalImagePaths;
        product.sizeS = sizes[0];
        product.sizeM = sizes[1];
        product.sizeL = sizes[2];
        product.sizeXL = sizes[3];
        product.sizeXXL = sizes[4];
        product.totalStock = totalStock;

        await product.save();

        req.flash("success", "Product updated successfully");
        res.status(200).json({ message: "Product updated successfully" });
    } catch (error) {
        console.error("Error updating product:", error);
        req.flash("error", "Failed to update product");
        res.status(500).json({ message: "Failed to update product" });
    }
};



export const list = async(req,res)=>{
    try {
        const id= req.params.id;
        console.log(id);
        
        const product = await Product.findById(id)
        console.log(product);
        
        product.isdelete=!product.isdelete;
        console.log(product.isdelete);
        
        await product.save()
        if(product.isdelete){
            req.flash("success","successfully deleted product")
        }else{
            req.flash("success","succesfully restore product")
        }
        res.redirect('/admin/product')

        
    } catch (error) {
        console.error('its not working');
        return res.status(500).send("its not  working now")
        
    }
}



export const offerpage = async(req,res)=>{
    try {
        const product = await Product.findById(req.params.id);
        if(!product){
            req.flash("error", "Product not found");
            return res.status(404).redirect("/admin/product");
        }
        res.render("admin/add-product-offer", {
            product: product,
            success: req.flash("success"), 
            error: req.flash("error") 
        });

    } catch (error) {
        req.flash("error", "An error occurred while fetching the product");
        return res.status(500).redirect("/admin/product");
        
    }
}
export const offerpost = async (req, res) => {
    try {
        const { discountPercentage } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            req.flash("error", "Product not found");
            return res.status(404).redirect("/admin/product");
        }

        
        if (product.offerType === "category" && product.isOfferActive) {
            req.flash("error", "Category offer is already active. You cannot apply a product offer.");
            return res.redirect(`/admin/product/${product._id}/offer`);
        }

       
        const discountAmount = (product.price * discountPercentage) / 100;
        product.Offerprice = Math.floor(product.price - discountAmount); 
        product.discountPercentage = discountPercentage;
        product.isOfferActive = true;
        product.offerType = "product"; 
        
        await product.save();
        req.flash("success", "Product offer applied successfully!");
        res.redirect("/admin/product");
    } catch (error) {
        req.flash("error", "Failed to apply product offer");
        return res.status(500).redirect("/admin/product");
    }
};



export const removeoffer = async(req,res)=>{
    try {
        const product = await Product.findById(req.params.id);
        if(!product){
            req.flash("error",'product find errror')
            return res.redirect("/admin/product")
        }
        product.isOfferActive=false,
        product.Offerprice=undefined,
        product.discountPercentage=undefined;
        await product.save();
        req.flash("success","offer remove successfully");
        res.redirect("/admin/product")
    } catch (error) {
        req.flash("error","offer remove error");
        return res.redirect("/admin/product")
        
    }
}
