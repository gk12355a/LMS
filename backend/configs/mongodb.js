import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not defined in .env');
    }
    if (!process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MONGODB_URI scheme');
    }

    mongoose.connection.on('connected', () => console.log('✅ MongoDB connected'));
    mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err.message));
    mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected'));

    await mongoose.connect(`${process.env.MONGODB_URI}/lms`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority',
      connectTimeoutMS: 30000
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

export default connectDB;