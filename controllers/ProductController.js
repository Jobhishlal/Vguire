import mongoose from 'mongoose';
import Product from '../models/products.js'; 
import Category from '../models/category.js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';


export const showProducts = async (req, res) => {
    try {
        const products = await Product.find().populate('category');

        // Generate cropped image paths based on the original image names
        const productsWithCroppedImages = products.map(product => ({
            ...product._doc,
            croppedImages: product.images.map(image => {
                const filename = path.basename(image); 
                return `/uploads/products/cropped-${filename}`;
            })
        }));

        res.render('admin/product', { products: productsWithCroppedImages });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving products');
    }
};


export const getproduct = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('admin/add-product', { categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Failed to fetch categories.');
    }
};


export const addProduct = async (req, res) => {
    try {
        const { name, description, price, category, sizeS, sizeM, sizeL, sizeXL, sizeXXL, imageBase64 } = req.body;

        if (!name || !price || !category || (!imageBase64 && (!req.files || req.files.length === 0))) {
            return res.status(400).json({ error: 'All fields including at least one image are required' });
        }

        // Check if category exists
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(400).json({ error: 'Invalid category selected' });
        }

        let imagePaths = [];
        let croppedImagePaths = [];

        // Handle base64 image if imageBase64 is provided
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

            // Save original image (if you want to keep both the full image and cropped image)
            const fullImagePath = path.join(uploadDir, imageName);
            await fs.promises.writeFile(fullImagePath, buffer);
            imagePaths.push(`/uploads/products/${imageName}`);

            // Save cropped image
            const croppedImagePath = path.join(uploadDir, croppedImageName);
            await sharp(buffer)
                .resize(500, 500)  // Resize to the desired dimensions
                .toFile(croppedImagePath);
            croppedImagePaths.push(`/uploads/products/${croppedImageName}`);
        }

        // Handle additional image uploads from the `req.files` array (if any)
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const originalPath = `/uploads/products/${file.filename}`;
                imagePaths.push(originalPath);

                // Crop the image and save it
                const croppedPath = `/uploads/products/cropped-${file.filename}`;
                await sharp(file.path)
                    .resize(500, 500)  // Resize the image as required
                    .toFile(`public${croppedPath}`);
                croppedImagePaths.push(croppedPath);
            }
        }

        console.log('Full image paths:', imagePaths);  // Debugging: Check full image paths
        console.log('Cropped image paths:', croppedImagePaths);  // Debugging: Check cropped image paths

        // Calculate total stock based on sizes
        const sizes = [sizeS, sizeM, sizeL, sizeXL, sizeXXL].map(size => parseInt(size) || 0);
        const totalStock = sizes.reduce((acc, size) => acc + size, 0);

        // Create new product and save it to the database
        const newProduct = new Product({
            name,
            description,
            price,
            category,
            images: croppedImagePaths, // Save cropped images only
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
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Failed to add product. Please try again.' });
    }
};




export const getEditProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        const categories = await Category.find();
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('admin/edit-product', { product, categories });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).send('Failed to fetch product details.');
    }
};



export const deleteimage = async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        // Find the product containing the image
        const product = await Product.findOne({ images: imageUrl });
        if (!product) {
            return res.status(404).json({ error: 'Product not found with this image' });
        }

        // Remove the image from the product's image array (handle duplicates)
        const imageExists = product.images.includes(imageUrl);
        if (imageExists) {
            product.images = product.images.filter(image => image !== imageUrl);
        } else {
            return res.status(404).json({ error: 'Image not found in product images' });
        }

        await product.save();

        // Delete the image from the file system
        const imagePath = path.join(process.cwd(), 'public', imageUrl);
        try {
            // Check if the file exists before attempting to delete it
            await fs.promises.access(imagePath, fs.constants.F_OK); // File should exist
            await fs.promises.unlink(imagePath); // Try deleting it
            console.log(`Image deleted: ${imagePath}`);
        } catch (err) {
            // Log the error but allow the deletion to succeed without file deletion
            console.warn(`Image not found on server, skipping deletion: ${imagePath}`, err);
            return res.status(404).json({ error: 'Image not found on server' });
        }

        res.status(200).json({ success: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'An error occurred while deleting the image.' });
    }
};
export const postEditProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category, sizeS, sizeM, sizeL, sizeXL, sizeXXL, imageBase64, deleteCurrentImage } = req.body;

        if (!name || !price || !category) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(400).json({ error: 'Invalid category selected' });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let imagePaths = [];
        let croppedImagePaths = [];

        // Handle image deletion if requested
        if (deleteCurrentImage === 'true' && product.images.length > 0) {
            // Delete current images from server
            for (let image of product.images) {
                const imagePath = path.join(process.cwd(), 'public', image);
                try {
                    await fs.promises.access(imagePath);  // Check if file exists
                    await fs.promises.unlink(imagePath);  // Delete file
                } catch (err) {
                    console.error(`Error deleting image: ${imagePath}`, err);
                }
            }
            product.images = []; // Clear images from database only if deletion is requested
        }

        // Handle base64 image upload
        if (imageBase64) {
            const base64Data = imageBase64.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const imageName = `product-${uniqueId}.jpg`;
            const croppedImageName = `cropped-${uniqueId}.jpg`;

            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
            if (!fs.existsSync(uploadDir)) {
                await fs.promises.mkdir(uploadDir, { recursive: true });
            }

            // Save original image
            const fullImagePath = path.join(uploadDir, imageName);
            await fs.promises.writeFile(fullImagePath, buffer);
            imagePaths.push(`/uploads/products/${imageName}`);

            // Save cropped image
            const croppedImagePath = path.join(uploadDir, croppedImageName);
            try {
                await sharp(buffer)
                    .resize(500, 500)  // Resize to 500x500
                    .toFile(croppedImagePath);
                croppedImagePaths.push(`/uploads/products/${croppedImageName}`);
            } catch (error) {
                console.error('Error processing cropped image:', error);
                return res.status(500).json({ error: 'Failed to process cropped image' });
            }
        }

        // Handle file uploads
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const originalPath = `/uploads/products/${file.filename}`;
                imagePaths.push(originalPath);

                const croppedPath = `/uploads/products/cropped-${file.filename}`;
                try {
                    await sharp(file.path)
                        .resize(500, 500)  // Resize to 500x500
                        .toFile(`public${croppedPath}`);
                    croppedImagePaths.push(croppedPath);
                } catch (error) {
                    console.error('Error processing cropped image:', error);
                    return res.status(500).json({ error: 'Failed to process cropped image' });
                }
            }
        }

        // Combine existing images with new ones
        const finalImagePaths = croppedImagePaths.length > 0 ? [...product.images, ...croppedImagePaths] : product.images;

        // Update product sizes and stock
        const sizes = [sizeS, sizeM, sizeL, sizeXL, sizeXXL].map(size => parseInt(size) || 0);
        const totalStock = sizes.reduce((acc, size) => acc + size, 0);

        // Update product details
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

        req.flash('success', 'Product updated successfully');
        res.redirect('/admin/product');
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product. Please try again.' });
    }
};


export const softDeleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).send('Product not found');
        }

        
        product.deleted = !product.deleted;  
        await product.save();

        res.redirect('/admin/product');  
    } catch (error) {
        console.error(error);
        res.status(500).send('Error soft deleting product');
    }
};
