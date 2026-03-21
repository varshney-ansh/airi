import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.APP_MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    } finally {
    // Ensures that the client will close when you finish/error
    await mongoose.disconnect();
  }
};

export default connectDB;