import { TOTP } from 'totp-generator';
import {Otp, User} from '../model/User.js';
import { OAuth2Client } from 'google-auth-library';


import sendOtpUserOtp from '../services/nodeMailer.js';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const userValidateEmailHelper = async (user) => {
  try {
    const existingUser = await User.findOne({ $or: [{ email: user.email }, { userName: user.userName }] });
    if (existingUser) {
      if (existingUser.email === user.email) {
        throw new Error('Email already exists');
      }
      throw new Error('Username already exists');
    }

    const otpSecret = 'JBSWY3DPEHPK3PXP';
    const { otp, expires } = TOTP.generate(otpSecret);
    
    let existingOtp = await Otp.findOne({ email: user.email });
    if (existingOtp) {
      existingOtp.otp = otp;
      existingOtp.expires = expires;
      await existingOtp.save();
    } else {
      existingOtp = new Otp({ otp, expires, email: user.email });
      await existingOtp.save();
    }

    await sendOtpUserOtp(user.email, otp); // Ensure otp is sent properly
    
    return { message: 'OTP sent successfully', user: user };
  } catch (error) {
    console.error('Error in user validation:', error);
    throw error;
  }
};

const userSignUpHelper = async (user) => {
  try {
    // Check if email or username already exists
    const existingUser = await User.findOne({ $or: [{ email: user.email }, { userName: user.userName }] });
    if (existingUser) {
      if (existingUser.email === user.email) {
        throw new Error('Email already exists');
      }
      throw new Error('Username already exists');
    }
    
    const otpInput = user.otp;
    const otpRecord = await Otp.findOne({ email: user.email });


    if (!otpRecord) {
      throw new Error('OTP not found');
    }
    if (otpRecord.otp !== otpInput) {
      throw new Error('Invalid OTP');
    }

    // Save new user
    const newUser = new User(user);
    const savedUser = await newUser.save();
    return { message: 'User saved successfully', user: savedUser };
  } catch (error) {
    console.error('Error saving user:', error);
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
            reject(new Error('Invalid credentials'));
          }
        } else {
          reject(new Error('Invalid credentials'));
        }
      })
      .catch((err) => {
        reject(new Error('Database query failed', err));
      });
  });
};

const userGoogleLoginHelper = async (credential) => {

  // Directly use the credential as the ID token since it's the entire JWT string
  const idToken = credential; // No need to decode or extract further

  // Validate the ID token is present
  if (!idToken) {
    throw new Error('ID token is missing');
  }


  try {
    const response = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    return response.payload;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw error; // Rethrow the error to be caught by the calling function
  }
};

const googleLoginUser = async (user) => {
  return new Promise((resolve, reject) => {
    const {  email } = user;
    User.findOne({ email })
      .then((admin) => {
        if (admin) {
          resolve(admin);
        } else {
          reject(new Error('User not found'));
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const logoutHelper = async (refreshToken) => {
  try {
    const user = await User.findOne({ token: refreshToken });
    if (user) {
      user.token = null;
      await user.save();
      return user;
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

export {  userLoginHelper ,logoutHelper, userSignUpHelper, userGoogleLoginHelper, googleLoginUser, userValidateEmailHelper};
