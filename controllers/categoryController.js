import Category from '../models/category.js';
import Product from '../models/products.js';



export const showCategories = async (req, res) => {
    try {
        const categories = await Category.find().lean();
        console.log(categories);
        
        for (let category of categories) {
          const productWithOffer = await Product.findOne({ 
                category: category._id, 
                isOfferActive: true, 
                offerType: "product"  
            }); 
            category.hasProductOffer = !!productWithOffer;
        }
        res.render("admin/categories", { 
            categories, 
            messages: {
                success: req.flash("success"),
                error: req.flash("error")
            }
        });

    } catch (error) {
        console.error("Error retrieving categories:", error);
        res.status(500).send("Error retrieving categories");
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
      
    
        // const existingcategory=await Category.findOne({name:{$regex:`^${name}$`,$options:"i"}});
        const existingCategory = await Category.findOne({ name }).collation({ locale: 'en', strength: 2 });
        if(existingCategory){
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
        console.log("Category ID:", req.params.id); 
        
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

export const applyCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            req.flash("error", "Category not found");
            return res.redirect("/admin/categories");
        }

        res.render("admin/applyCategoryOffer", { 
            category,
            messages: {
                success: req.flash("success"),
                error: req.flash("error")
            }
        });
    } catch (error) {
        console.error("Error fetching category offer page:", error);
        req.flash("error", "Internal Server Error");
        res.redirect("/admin/categories");
    }
};


export const applyCategoryOfferPost = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { offerPercentage } = req.body;

        if (!offerPercentage || offerPercentage <= 0 || offerPercentage > 100) {
            req.flash("error", "Invalid offer percentage. Please enter a value between 1 and 100.");
            return res.redirect(`/admin/category/${categoryId}/offer`);
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            req.flash("error", "Category not found");
            return res.redirect("/admin/categories");
        }

        const productWithOffer = await Product.findOne({
            category: categoryId,
            isOfferActive: true,
            offerType: "product" 
        });

        if (productWithOffer) {
            req.flash("error", "Cannot apply category offer as some products already have a product-level offer.");
            return res.redirect(`/admin/category/${categoryId}/offer`);
        }

      
        const products = await Product.find({ category: categoryId, isOfferActive: false });

        
        for (const product of products) {
            const discountAmount = (product.price * offerPercentage) / 100;
            product.Offerprice = Math.floor(product.price - discountAmount); 
            product.isOfferActive = true;
            product.discountPercentage = offerPercentage;
            product.offerType = "category";
            await product.save();
        }
       console.log(products.Offerprice);
       console.log("offer",products);
       
       

        req.flash("success", `Category offer of ${offerPercentage}% applied successfully!`);
        res.redirect("/admin/categories");

    } catch (error) {
        console.error("Error applying category offer:", error);
        res.status(500).send("Internal Server Error");
    }
};



export const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        const category = await Category.findById(categoryId);
        if (!category) {
            req.flash("error", "Category not found");
            return res.redirect("/admin/categories");
        }

        const result = await Product.updateMany(
            { category: categoryId, offerType: "category" }, 
            { 
                $set: { 
                    isOfferActive: false, 
                    offerType: null, 
                    discountPercentage: 0 
                }
            }
        );

        if (result.nModified > 0) {
            req.flash("success", `${result.nModified} product(s) had the category offer removed successfully!`);
        } else {
            req.flash("info", "No products had the category offer to remove.");
        }
        
       
        console.log("flash success:", req.flash("success"));
        console.log("flash error:", req.flash("error"));
        
        res.redirect("/admin/categories");
        

    } catch (error) {
        console.error("Error removing category offer:", error);
        req.flash("error", "Internal Server Error");
        res.redirect("/admin/categories");
    }
};
