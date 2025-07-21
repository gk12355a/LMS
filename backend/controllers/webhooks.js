import { Webhook } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";
import { sendToQueue } from "../configs/rabbitmq.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// API Controller Function to Manage Clerk User with database
export const clerkWebhooks = async (req, res) => {
  try {
    console.log("📩 Webhook Headers:", req.headers);
    console.log("📨 Webhook Raw Body:", req.body);

    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });

    const { data, type } = req.body;

    switch (type) {
      case "user.created": {
        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
        };
        await User.create(userData);

        // Send to RabbitMQ for async processing
        await sendToQueue('user_created', {
          userId: data.id,
          email: userData.email,
          name: userData.name,
          imageUrl: userData.imageUrl,
          timestamp: new Date().toISOString()
        });

        res.json({});
        break;
      }

      case "user.updated": {
        const userData = {
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
        };
        await User.findByIdAndUpdate(data.id, userData);

        // Send to RabbitMQ for async processing
        await sendToQueue('user_updated', {
          userId: data.id,
          updatedData: userData,
          timestamp: new Date().toISOString()
        });

        res.json({});
        break;
      }

      case "user.deleted": {
        await User.findByIdAndDelete(data.id);

        // Send to RabbitMQ for async processing
        await sendToQueue('user_deleted', {
          userId: data.id,
          timestamp: new Date().toISOString()
        });

        res.json({});
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Clerk webhook error:", error);
    res.json({ success: false, message: error.message });
  }
};

export const stripeWebhooks = async (request, response) => {
  const sig = request.headers["stripe-signature"];

  let event;

  try {
    event = Stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      const { purchaseId } = session.data[0].metadata;
      const purchaseData = await Purchase.findById(purchaseId);
      
      if (purchaseData) {
        purchaseData.status = "completed";
        await purchaseData.save();

        // Update user's enrolled courses
        const user = await User.findById(purchaseData.userId);
        const course = await Course.findById(purchaseData.courseId);
        
        if (user && course) {
          user.enrolledCourses.push(purchaseData.courseId);
          course.enrolledStudents.push(purchaseData.userId);
          await Promise.all([user.save(), course.save()]);
        }

        // Send to RabbitMQ for async processing
        await sendToQueue('payment_succeeded', {
          purchaseId,
          userId: purchaseData.userId,
          courseId: purchaseData.courseId,
          amount: purchaseData.amount,
          paymentIntentId,
          timestamp: new Date().toISOString()
        });
      }

      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      const { purchaseId } = session.data[0].metadata;
      const purchaseData = await Purchase.findById(purchaseId);
      
      if (purchaseData) {
        purchaseData.status = "failed";
        await purchaseData.save();

        // Send to RabbitMQ for async processing
        await sendToQueue('payment_failed', {
          purchaseId,
          userId: purchaseData.userId,
          courseId: purchaseData.courseId,
          amount: purchaseData.amount,
          paymentIntentId,
          failureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }

      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object;
      
      // Send to RabbitMQ for async processing
      await sendToQueue('checkout_completed', {
        sessionId: session.id,
        purchaseId: session.metadata.purchaseId,
        customerEmail: session.customer_details?.email,
        timestamp: new Date().toISOString()
      });

      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      
      // Send to RabbitMQ for async processing
      await sendToQueue('checkout_expired', {
        sessionId: session.id,
        purchaseId: session.metadata.purchaseId,
        timestamp: new Date().toISOString()
      });

      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  response.json({ received: true });
};
