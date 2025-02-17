
// import multer from 'multer';
// import path from 'path';
// import sharp from 'sharp';
// import fs from 'fs/promises';

// // Function to create the upload directory if it doesn't exist
// const createUploadDirIfNeeded = async (dirPath) => {
//     try {
//         await fs.mkdir(dirPath, { recursive: true });
//     } catch (err) {
//         console.error(`Error creating directory: ${dirPath}`, err);
//     }
// };

// // Category Image Storage Configuration
// const categoryStorage = multer.diskStorage({
//     destination: async function (req, file, cb) {
//         const uploadDir = 'public/uploads/categories';
//         await createUploadDirIfNeeded(uploadDir);  // Ensure the directory exists before uploading
//         cb(null, uploadDir);
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + path.extname(file.originalname));  // Use timestamp as filename
//     }
// });

// const categoryUpload = multer({ 
//     storage: categoryStorage,
//     limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB max
//     fileFilter: (req, file, cb) => {
//         const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
//         if (allowedTypes.includes(file.mimetype)) {
//             cb(null, true);
//         } else {
//             cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.'));
//         }
//     }
// }).single('categoryImage');

// // Profile Image Storage Configuration
// const profileStorage = multer.diskStorage({
//     destination: async function (req, file, cb) {
//         const uploadDir = 'public/uploads/profileImage';
//         await createUploadDirIfNeeded(uploadDir);  // Ensure the directory exists before uploading
//         cb(null, uploadDir);
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + path.extname(file.originalname));  // Use timestamp as filename
//     }
// });

// const profileUpload = multer({
//     storage: profileStorage,
//     limits: { fileSize: 15 * 1024 * 1024 },  // Limit profile images to 5MB
//     fileFilter: (req, file, cb) => {
//         const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
//         if (allowedTypes.includes(file.mimetype)) {
//             cb(null, true);
//         } else {
//             cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.'));
//         }
//     }
// }).single('profileImage');

// // Product Image Storage Configuration
// const productStorage = multer.diskStorage({
//     destination: async function (req, file, cb) {
//         const uploadDir = 'public/uploads/products';
//         await createUploadDirIfNeeded(uploadDir);  
//         cb(null, uploadDir);
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + path.extname(file.originalname));  
//     }
// });

// const productUpload = multer({
//     storage: productStorage,
//     limits: { fileSize: 10 * 1024 * 1024 }, 
//     fileFilter: (req, file, cb) => {
//         const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
//         if (allowedTypes.includes(file.mimetype)) {
//             cb(null, true);
//         } else {
//             cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.'));
//         }
//     }
// }).array('image[]', 5); // Allows uploading multiple product images

// // Validate Image using sharp (check if it's a valid image)
// const validateImage = async (filePath) => {
//     try {
//         await sharp(filePath).metadata();  // Checks if the file is a valid image
//         return true;
//     } catch (err) {
//         console.error(`Invalid image file: ${filePath}`, err);
//         return false;
//     }
// };

// // Process Product Images (Resize and Crop)
// const processProductImages = async (req, res, next) => {
//     if (!req.files || req.files.length === 0) {
//         return res.status(400).json({ error: 'No files uploaded' });
//     }

//     try {
//         const croppedImages = await Promise.all(
//             req.files.map(async (file) => {
//                 const croppedImagePath = `public/uploads/products/cropped-${file.filename}`;

//                 // Validate Image before processing
//                 const isValidImage = await validateImage(file.path);
//                 if (!isValidImage) {
//                     throw new Error(`Invalid image file: ${file.filename}`);
//                 }

                
//                 await sharp(file.path)
//                     .resize(500, 500) 
//                     .jpeg({ quality: 80 }) 
//                     .toFile(croppedImagePath);

//                 return `uploads/products/cropped-${file.filename}`;
//             })
//         );

//         req.body.croppedImages = croppedImages;
//         next();
//     } catch (error) {
//         console.error('Error processing images:', error);
//         res.status(500).json({ error: `Image processing error: ${error.message}` });
//     }
// };


// export { categoryUpload, productUpload, processProductImages, profileUpload };



import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs';
import { log } from 'console';


const createUploadDirIfNeeded = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const categoryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads/categories';
        createUploadDirIfNeeded(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const categoryUpload = multer({
    storage: categoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type.'));
    }
}).single('categoryImage');


const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads/profileImage';
        createUploadDirIfNeeded(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const profileUpload = multer({
    storage: profileStorage,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        console.log("Uploaded File MIME Type:", file.mimetype);
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type.'));
    }
}).single('profileImage');




const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads/products';
        createUploadDirIfNeeded(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const productUpload = multer({
    storage: productStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type.'));
    }
}).array('images', 5); 


const validateImage = async (filePath) => {
    try {
        await sharp(filePath).metadata();
        return true;
    } catch (err) {
        console.error(`Invalid image file: ${filePath}`, err);
        return false;
    }
};


const processProductImages = async (req, res, next) => {
    console.log("🔍 processProductImages Middleware Triggered");

    if (!req.files || req.files.length === 0) {
        console.log(" No new images uploaded. Skipping image processing.");
        req.body.croppedImages = []; 
        return next();
    }

    try {
       
        const croppedImages = await Promise.all(
            req.files.map(async (file) => {
                const croppedImagePath = `public/uploads/products/cropped-${file.filename}`;

       
                const isValidImage = await validateImage(file.path);
                if (!isValidImage) {
                    console.error(`🚨 Invalid image file detected: ${file.filename}`);
                    return null;
                }

                try {
                    await sharp(file.path)
                        .resize(500, 500)
                        .jpeg({ quality: 80 })
                        .toFile(croppedImagePath);
                } catch (sharpError) {
                    console.error(` Sharp processing failed for ${file.filename}:`, sharpError);
                    return null;
                }

                return `uploads/products/cropped-${file.filename}`;
            })
        );

        req.body.croppedImages = croppedImages.filter(Boolean);
        next();
    } catch (error) {
        console.error(" Error processing images:", error);
        return res.status(500).json({ error: `Image processing error: ${error.message}` });
    }
};


export { categoryUpload, productUpload, processProductImages, profileUpload };
