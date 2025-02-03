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
        const { name, description } = req.body;  
        const image = req.file.filename;
        const existingcategory=await Category.findOne({name});
        if(existingcategory){
            req.flash("error","please  add unique category")
         return res.redirect('/admin/add-category')
        }

        const newCategory = new Category({
            name,
            description,  
            image
        });

        await newCategory.save();
        res.redirect('/admin/categories');
    } catch (error) {
        console.error("Error adding category:", error.message);
        res.status(500).send('Error adding category');
    }
};



export const getEditCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        res.render('admin/edit-category', { category , messages: req.flash()});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving category');
    }
};


export const updateCategory = async (req, res) => {
    try {
        const { name,description } = req.body;
        const image = req.file ? req.file.filename : req.body.oldImage;

        await Category.findByIdAndUpdate(req.params.id, { name, image ,description});
        res.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating category');
    }
};


export const list = async (req, res) => {
    try {
        const id = req.params.id;

        const category = await Category.findOne({ _id: id });
        console.log("Before toggle:", category.isListed); 
        
        category.isListed = !category.isListed;

        console.log("After toggle:", category.isListed); 

        await category.save();

        res.redirect("/admin/categories");
    } catch (error) {
        console.error(error);
        return res.status(500).send("It's not working");
    }
};
