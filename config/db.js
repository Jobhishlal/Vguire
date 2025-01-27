import mongoose from 'mongoose'

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URI).then(()=>{
            console.log("Mongo db connected");
            
        })
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};




export default connectDB; 