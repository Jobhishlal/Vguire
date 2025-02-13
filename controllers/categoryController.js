import Category from '../models/category.js';



export const showCategories = async (req, res) => {
    try {
        const categories = await Category.find();
    res.render('admin/categories', { categories ,messages:{
        success:req.flash("success"),
        error:req.flash("error")
    }});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving categories');
    }
};

export const addCategory = async (req, res) => {
    try {
        let { name, description } = req.body;  
        name=name?.trim();
        description=description?.trim();

        if(!name || !description){
            req.flash("error","please fill all fields")
            return res.redirect("/admin/add-category")

        }

        if(!req.file ){
            req.flash("error","please add proper image")
            return res.redirect("/admin/add-category")
        }

        const image = req.file.filename;
      
    
        const existingcategory=await Category.findOne({name:{$regex:`^${name}$`,$options:"i"}});
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
        req.flash("success","successfully added new category")
        res.redirect('/admin/categories');
    } catch (error) {
        console.error("Error adding category:", error.message);
        res.status(500).send('Error adding category');
    }
};



export const getEditCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            req.flash("error", "Category not found!");
            return res.redirect("/admin/categories");
        }

        res.render('admin/edit-category', { 
            category, 
            messages: {
                success: req.flash("success"),
                error: req.flash("error")
            } 
        });
    } catch (error) {
        console.error("Error retrieving category:", error);
        req.flash("error", "Error retrieving category.");
        res.redirect("/admin/categories");
    }
};
export const updateCategory = async (req, res) => {
    try {
        let { name, description, oldImage } = req.body;
        const categoryId = req.params.id;

        if (!name.trim() || !description.trim()) {
            req.flash("error", "⚠️ All fields are required!");
            return res.redirect(`/admin/edit-category/${categoryId}`);
        }

        const existingCategory = await Category.findOne({
            name: { $regex: `^${name}$`, $options: "i" },
            _id: { $ne: categoryId }
        });

        if (existingCategory) {
            req.flash("error", " Category name already exists! Please choose a different name.");
            return res.redirect(`/admin/edit-category/${categoryId}`);
        }

                


        const image = req.file ? req.file.filename : oldImage;

        await Category.findByIdAndUpdate(categoryId, { name, image, description });

        req.flash("success", "Category updated successfully!");
        res.redirect('/admin/categories');

    } catch (error) {
        console.error("Error updating category:", error);
        req.flash("error", "Error updating category! Please try again.");
        res.redirect(`/admin/edit-category/${req.params.id}`);
    }
};


export const list = async (req, res) => {
    try {
        const id = req.params.id;

        const category = await Category.findOne({ _id: id });
        console.log("Before toggle:", category.isListed); 
        if(!category){
            req.flash("error","category not found");
            return res.redirect("/admin/categories")
        }
        
        category.isListed = !category.isListed;

        console.log("After toggle:", category.isListed); 

        await category.save();
        if(category.isListed){
            req.flash("success","category successfully deleted")
        }else{
            req.flash("success","categroy success fully restored")
        }

        res.redirect("/admin/categories");
    } catch (error) {
        req.flash("error", " Something went wrong!");
        return res.redirect("/admin/categories");
    }
};
