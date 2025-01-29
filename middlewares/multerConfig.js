import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs/promises';

// Utility function to create directories if they don't exist
const createUploadDirIfNeeded = async (dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
        console.error(`Error creating directory: ${dirPath}`, err);
    }
};

// Category Image Storage Configuration
const categoryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/categories';
        createUploadDirIfNeeded(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const categoryUpload = multer({ storage: categoryStorage }).single('categoryImage');

// Product Image Storage Configuration
const productStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/products';
        createUploadDirIfNeeded(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const productUpload = multer({ storage: productStorage }).array('image[]', 5);

// Utility function to validate image files
const validateImage = async (filePath) => {
    try {
        await sharp(filePath).metadata(); // Check if the image is valid
        return true;
    } catch (err) {
        console.error(`Invalid image file: ${filePath}`, err);
        return false;
    }
};

// Middleware to process cropped images
const processProductImages = async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
        const croppedImages = await Promise.all(
            req.files.map(async (file) => {
                const croppedImagePath = `public/uploads/products/cropped-${file.filename}`;

                // Validate if the file is a valid image
                const isValidImage = await validateImage(file.path);
                if (!isValidImage) {
                    throw new Error(`Invalid image file: ${file.filename}`);
                }

                await sharp(file.path)
                    .resize(500, 500) 
                    .jpeg({ quality: 80 }) 
                    .toFile(croppedImagePath);

                return `uploads/products/cropped-${file.filename}`; 
            })
        );

        req.body.croppedImages = croppedImages;
        next();
    } catch (error) {
        console.error('Error processing images:', error);
        res.status(500).json({ error: `Image processing error: ${error.message}` });
    }
};

export { categoryUpload, productUpload, processProductImages };