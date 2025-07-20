import { consumeFromQueue } from '../configs/rabbitmq.js';

// Email templates
const emailTemplates = {
  welcome: {
    subject: 'Welcome to LMS Platform!',
    body: 'Welcome {{name}}! Thank you for joining our learning platform.'
  },
  enrollment: {
    subject: 'Course Enrollment Confirmation',
    body: 'Hi {{name}}, you have successfully enrolled in "{{courseName}}".'
  },
  payment: {
    subject: 'Payment Confirmation',
    body: 'Hi {{name}}, your payment of ${{amount}} for "{{courseName}}" has been processed successfully.'
  },
  courseComplete: {
    subject: 'Congratulations! Course Completed',
    body: 'Hi {{name}}, congratulations on completing "{{courseName}}"!'
  }
};

// Email sending function (mock implementation)
const sendEmail = async (emailData) => {
  try {
    // In production, integrate with email service like SendGrid, AWS SES, etc.
    console.log('📧 Sending email:', {
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Email sent successfully to:', emailData.to);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
};

// Template processing function
const processTemplate = (template, data) => {
  let processedSubject = template.subject;
  let processedBody = template.body;

  // Replace placeholders with actual data
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key}}}`;
    processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), data[key]);
    processedBody = processedBody.replace(new RegExp(placeholder, 'g'), data[key]);
  });

  return {
    subject: processedSubject,
    body: processedBody
  };
};

// Email worker function
const processEmailMessage = async (message) => {
  try {
    console.log('📨 Processing email message:', message);

    const { to, subject, body, template, data } = message;

    let emailContent;
    
    if (template && emailTemplates[template]) {
      // Use template
      emailContent = processTemplate(emailTemplates[template], data || {});
    } else {
      // Use direct content
      emailContent = { subject, body };
    }

    const emailData = {
      to,
      subject: emailContent.subject,
      body: emailContent.body
    };

    const success = await sendEmail(emailData);
    
    if (!success) {
      throw new Error('Failed to send email');
    }

  } catch (error) {
    console.error('❌ Error processing email message:', error);
    throw error; // Re-throw to trigger message nack
  }
};

// Start email worker
export const startEmailWorker = async () => {
  try {
    await consumeFromQueue('email_notifications', processEmailMessage);
    console.log('🔄 Email worker started successfully');
  } catch (error) {
    console.error('❌ Failed to start email worker:', error);
  }
};

export default startEmailWorker;
