import { verify } from 'argon2';
import Admin from '../model/AdminModel.js';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../model/User.js';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const adminLoginHelper = (loginData) =>
  new Promise((resolve, reject) => {
    const { email, password } = loginData;

    Admin.findOne({ email })
      .then(async (admin) => {
        if (!admin) {
          throw new Error('Email or Password is Mismatch');
        }
        const isPasswordValid = await verify(admin.password, password);
        if (isPasswordValid) {
          resolve(admin);
        } else {
          reject(new Error('Invalid password'));
        }
      })
      .catch((error) => {
        reject(error);
      });
  });

const adminGoogleLoginHelper = async (credential) => {
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
    console.error('Response:', response.payload);

    const { email_verified, email } = response.payload;
    console.error('Email verified:', email_verified, email);
    return response.payload;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw error; // Rethrow the error to be caught by the calling function
  }
};

const googleLoginAdmin = async (user) => {
  return new Promise((resolve, reject) => {
    const { email } = user;
    Admin.findOne({ email })
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

const usersHelper = async () => {
  return new Promise((resolve, reject) => {
    User.find()
      .then((users) => {
        resolve(users);
      })
      .catch((error) => {
        reject(error);
      });
  });
};
const fetchUserHelper = (id) => {
  return new Promise((resolve, reject) => {
    User.findById(id).populate('following').populate('followers')
      .then((user) => {
        resolve(user);
      })
      .catch((error) => {
        reject(error);
      });

  });
};
export { adminLoginHelper,fetchUserHelper, adminGoogleLoginHelper, googleLoginAdmin, usersHelper };
