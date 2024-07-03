import { TOTP } from "totp-generator"
import {Otp, User} from "../model/User.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";


import sendOtpUserOtp from "../services/nodeMailer.js";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const userValidateEmailHelper = async (user) => {
  try {
    console.log("User sign-up data:", user);

    // Check if email or username already exists
    const existingUser = await User.findOne({ $or: [{ email: user.email }, { userName: user.userName }] });
    if (existingUser) {
      if (existingUser.email === user.email) {
        throw new Error("Email already exists");
      }
      throw new Error("Username already exists");
    }

    // Generate OTP
    const { otp, expires } = TOTP.generate("JBSWY3DPEHPK3PXP");

    // Save OTP in the database
    const newOtp = new Otp({ otp, expires, email: user.email });
    const savedOtp = await newOtp.save();

    // Send OTP to the user's email
    const response = await sendOtpUserOtp(user.email, otp || 32432);
    console.log("OTP sent successfully:", response);

    return { message: "OTP sent successfully", user: user };
  } catch (error) {
    console.error("Error in user validation:", error);
    throw error;
  }
};

const userSignUpHelper = async (user) => {
  try {
    // Check if email or username already exists
    const existingUser = await User.findOne({ $or: [{ email: user.email }, { userName: user.userName }] });
    if (existingUser) {
      if (existingUser.email === user.email) {
        throw new Error("Email already exists");
      }
      throw new Error("Username already exists");
    }
    const otpInput = user.Otp
    console.log(user);

    const otpRecord = await Otp.findOne({ email: user.email })
    console.log(otpRecord);
    console.log(otpInput);

    if (!otpRecord || otpRecord.otp !== otpInput ) {
      throw new Error("Invalid or expired OTP");
    }

    // Save new user
    const newUser = new User(user);
    const savedUser = await newUser.save();
    console.log("User saved successfully:", savedUser);
    return { message: "User saved successfully", user: savedUser };
  } catch (error) {
    console.error("Error saving user:", error);
    throw error; // Propagate the error up to the caller
  }
};


const userLoginHelper = async (user) => {
  return new Promise((resolve, reject) => {
    User.findOne({ email: user.email })
      .then((existingUser) => {
        if (existingUser) {
          if (existingUser.password === user.password) {
            resolve(existingUser);
          } else {
            reject(new Error("Invalid credentials"));
          }
        } else {
          reject(new Error("Invalid credentials"));
        }
      })
      .catch((err) => {
        reject(new Error("Database query failed"));
      });
  });
};

const userGoogleLoginHelper = async (credential) => {

  // Directly use the credential as the ID token since it's the entire JWT string
  const idToken = credential; // No need to decode or extract further

  // Validate the ID token is present
  if (!idToken) {
    throw new Error("ID token is missing");
  }

  console.log("Verifying ID token:", idToken);

  try {
    const response = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    console.log("Response:", response.payload);

    const { email_verified, name, email } = response.payload
    console.log("Email verified:", email_verified, email);
    return response.payload
  } catch (error) {
    console.error("Error verifying ID token:", error);
    throw error; // Rethrow the error to be caught by the calling function
  }
};

const googleLoginUser = async (user) => {
  return new Promise((resolve, reject) => {
    const { email_verified, name, email } = user;
    User.findOne({ email })
      .then((admin) => {
        if (admin) {
          resolve(admin);
        } else {
          reject(new Error("User not found"));
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};
export {  userLoginHelper ,userSignUpHelper, userGoogleLoginHelper, googleLoginUser, userValidateEmailHelper};
