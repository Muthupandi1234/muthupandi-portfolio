import axios from 'axios';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create and configure Nodemailer transporter (only if email credentials present)
let transporter = null;
if (process.env.EMAIL_ADDRESS && process.env.GMAIL_PASSKEY) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.GMAIL_PASSKEY,
    },
  });
}

// Helper function to send a message via Telegram
async function sendTelegramMessage(token, chat_id, message) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await axios.post(url, {
      text: message,
      chat_id,
    });
    return res.data.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error.response?.data || error.message);
    return false;
  }
};

// HTML email template
const generateEmailTemplate = (name, email, userMessage) => `
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #007BFF;">New Message Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left: 4px solid #007BFF; padding-left: 10px; margin-left: 0;">
        ${userMessage}
      </blockquote>
      <p style="font-size: 12px; color: #888;">Click reply to respond to the sender.</p>
    </div>
  </div>
`;

// Helper function to send an email via Nodemailer
async function sendEmail(payload, message) {
  if (!transporter) {
    console.warn('Email transporter not configured. Skipping email send.');
    return false;
  }

  const { name, email, message: userMessage } = payload;

  const mailOptions = {
    from: `${process.env.EMAIL_SENDER_NAME || 'Portfolio'} <${process.env.EMAIL_ADDRESS}>`,
    to: process.env.EMAIL_ADDRESS,
    subject: `New Message From ${name}`,
    text: message,
    html: generateEmailTemplate(name, email, userMessage),
    replyTo: email,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error while sending email:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const { name, email, message: userMessage } = payload;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat_id = process.env.TELEGRAM_CHAT_ID;
    const canSendTelegram = Boolean(token && chat_id);
    const canSendEmail = Boolean(process.env.EMAIL_ADDRESS && process.env.GMAIL_PASSKEY);

    if (!canSendTelegram && !canSendEmail) {
      return NextResponse.json({
        success: false,
        message: 'No delivery channel configured. Please set Telegram or Gmail environment variables.',
      }, { status: 400 });
    }

    const message = `New message from ${name}\n\nEmail: ${email}\n\nMessage:\n\n${userMessage}\n\n`;

    let telegramSuccess = false;
    let emailSuccess = false;

    if (canSendTelegram) {
      telegramSuccess = await sendTelegramMessage(token, chat_id, message);
    }

    if (canSendEmail) {
      emailSuccess = await sendEmail(payload, message);
    }

    // Consider success if at least one channel succeeded
    if (telegramSuccess || emailSuccess) {
      return NextResponse.json({
        success: true,
        message: 'Message sent successfully.',
        details: { telegram: telegramSuccess, email: emailSuccess },
      }, { status: 200 });
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to deliver message via configured channels.',
      details: { telegram: telegramSuccess, email: emailSuccess },
    }, { status: 500 });
  } catch (error) {
    console.error('API Error:', error.message);
    return NextResponse.json({
      success: false,
      message: 'Server error occurred.',
    }, { status: 500 });
  }
};