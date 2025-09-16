import mongoose from "mongoose";

const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected successfully`);
  } catch (error) {
    console.log({ message: "Error in connecting to MongoDB", error: error });
  }
};

export default connectMongoDB;
