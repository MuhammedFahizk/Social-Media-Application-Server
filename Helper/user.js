import User from "../model/User.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const userSignUpHelper = (user) => {
  console.log("User sign-up data:", user);
  return new Promise((resolve, reject) => {
    User.findOne({ $or: [{ email: user.email }, { userName: user.userName }] })
      .then((existingUser) => {
        if (existingUser) {
          if (existingUser.email === user.email) {
            return reject(new Error("Email already exists"));
          }
          return reject(new Error("Username already exists"));
        }
        const newUser = new User(user);
        return newUser.save();
      })
      .then((savedUser) => {
        if (savedUser) {
          resolve(savedUser);
        }
      })
      .catch((err) => {
        console.error("Error during user sign-up:", err);
        reject(err);
      });
  });
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
export { userSignUpHelper, userLoginHelper , userGoogleLoginHelper, googleLoginUser};
