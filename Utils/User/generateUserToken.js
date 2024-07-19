import pkg from 'jsonwebtoken';
import {User} from '../../model/User.js';

const { sign } = pkg;

export const generateUserToken = async (user) => {
  try {
    const payload = { _id: user._id };
    if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_PRIVATE_KEY) {
      throw new Error('Missing environment variables');
    }
    const isAdmin = false;

    const accessToken = sign({ ...payload, isAdmin }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '4m',
    });
    const refreshToken = sign({ ...payload, isAdmin }, process.env.REFRESH_TOKEN_PRIVATE_KEY, {
      expiresIn: '7d',
    });
    await User.updateOne(
      { _id: user._id },
      { $set: { token: refreshToken } }
    );


    return { accessToken, refreshToken };
  } catch (err) {
    console.error('Error generating tokens:', err);
    throw new Error('Token generation failed');
  }
};

