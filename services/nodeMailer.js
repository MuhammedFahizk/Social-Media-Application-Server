import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fahizk100@gmail.com',
    pass: process.env.NODEMAILER_PASSWORD,
  },
});
function sendOtpUserOtp(email, otp) {
  console.error(otp, email); // Log OTP and email for debugging
  return new Promise((resolve, reject) => {
    const mailOption = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: 'Your OTP for Login',
      text: `Your OTP is: ${otp}`
    };

    transporter.sendMail(mailOption, (error, info) => {
      if (error) {
        console.error('Error sending email:', error); // Log detailed error
        reject(error); // Reject with error if email sending fails
      } else {
        console.error('Email sent:', info.response); // Log success response
        resolve(info); // Resolve with info if email sending is successful
      }
    });
  });
}

export default sendOtpUserOtp;
