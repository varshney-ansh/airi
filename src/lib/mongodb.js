import mongoose from 'mongoose';
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.APP_MONGO_URI, { dbName: "airi_db", ...clientOptions });
        console.log('MongoDB connected');
    } catch (err) {
        console.error(err.message);
    }
};

export default connectDB;