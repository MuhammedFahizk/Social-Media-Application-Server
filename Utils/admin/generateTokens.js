import pkg from 'jsonwebtoken';

import Admin from '../../model/AdminModel.js';

const { sign } = pkg;

const generateToken = async (user) => {
  try {
    const payload = { _id: user._id };
    const isAdmin = true;
    const accessToken = sign({...payload, isAdmin}, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '4m',
    });
    const refreshToken = sign({...payload, isAdmin}, process.env.REFRESH_TOKEN_PRIVATE_KEY, {
      expiresIn: '7d',
    });
    await Admin.updateOne(
      { _id: user._id },
      {
        $set: {
          token: refreshToken,
        },
      },
    );
  

    return Promise.resolve({ refreshToken, accessToken });
  } catch (err) {
    return Promise.reject(err);
  }
};

 
const generateAdminAccessToken = async (user) => {
  try {
    const payload = { _id: user._id };
   
    // Verify environment variables
    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error('Missing environment variables');
    }
    const isAdmin = true; // or true, depending on your use case

    const accessToken = sign({ ...payload, isAdmin }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '1m',
    });

    return { newAccessToken: accessToken };
  } catch (err) {
    console.error('Error generating access token:', err);
    throw new Error('Token generation failed');
  }
};

export { generateToken, generateAdminAccessToken };
