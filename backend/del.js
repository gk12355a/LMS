import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function deleteTestCourses() {
  try {
    // Kết nối tới MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const connectionString = process.env.MONGODB_URI.startsWith('mongodb://') || 
                           process.env.MONGODB_URI.startsWith('mongodb+srv://') 
                           ? process.env.MONGODB_URI 
                           : `mongodb://${process.env.MONGODB_URI}`;

    await mongoose.connect(`${connectionString}/lms`);
    console.log("Database Connected");

    // Xóa document
    const Course = mongoose.model('courses', new mongoose.Schema({})); // Model tạm
    const result = await Course.deleteMany({ "courseTitle": "test" });
    console.log(`${result.deletedCount} documents deleted`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

deleteTestCourses();