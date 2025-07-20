import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import connectCloudinary from './configs/cloudinary.js'
import connectRedis from './configs/redis.js'
import connectRabbitMQ from './configs/rabbitmq.js'
import { clerkWebhooks, stripeWebhooks } from  './controllers/webhooks.js'
import educatorRouter from './routes/educatorRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoutes.js'

// Initialize Express
const app = express();

// Initialize connections
const initializeConnections = async () => {
  try {
    await connectDB();
    await connectCloudinary();
    await connectRedis();
    await connectRabbitMQ();
    console.log('🚀 All services connected successfully');
  } catch (error) {
    console.error('❌ Failed to initialize connections:', error);
    process.exit(1);
  }
};

// Initialize all connections
initializeConnections();

// Middlewares
app.use(cors());
app.use(clerkMiddleware())

// Routes
app.get('/', (req, res) => res.send("API Working"));
app.post('/clerk', express.json(), clerkWebhooks)
app.use('/api/educator', express.json(), educatorRouter)
app.use('/api/course', express.json(), courseRouter)
app.use('/api/user', express.json(), userRouter)
app.post('/stripe', express.raw({type :'application/json'}), stripeWebhooks) 

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});