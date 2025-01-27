import Category from '../models/category.js';


export const showCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('admin/categories', { categories });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving categories');
    }
};

export const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;  // Ensure description is extracted
        const image = req.file.filename;

        const newCategory = new Category({
            name,
            description,  // Add description to model
            image
        });

        await newCategory.save();
        res.redirect('/admin/categories');
    } catch (error) {
        console.error("Error adding category:", error.message);
        res.status(500).send('Error adding category');
    }
};


// Get edit category page
export const getEditCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        res.render('admin/edit-category', { category });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving category');
    }
};

// Update category
export const updateCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const image = req.file ? req.file.filename : req.body.oldImage;

        await Category.findByIdAndUpdate(req.params.id, { name, image });
        res.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating category');
    }
};

export const   list = async (req,res)=>{

    try {
        
        const id = req.params.id

        const category = await Category.findOne({_id:id})
        category.isListed = !category.isListed

        
        await category.save();


        res.redirect("/admin/categories")
        console.log(category.isListed)


    } catch (error) {
        
    }
}