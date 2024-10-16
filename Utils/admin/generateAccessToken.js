import pkg from 'jsonwebtoken';
import Admin from '../../model/AdminModel.js';
const { sign } = pkg;
const generateAccessToken = async (refreshToken) => {
  try {
    console.log(refreshToken);
    const admin = await Admin.findOne({token: refreshToken });
    const payload = { _id: admin._id };
    if (typeof refreshToken !== 'string') {
      throw new Error('Invalid refresh token format');
    }
    console.log(admin);
    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error('Missing environment variables');
    }
    const isAdmin = true;
    const accessToken = sign({ ...payload, isAdmin }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '4m',
    });

    return { newAccessToken: accessToken };
  } catch (err) {
    console.error('Error generating access token:', err);
    throw new Error('Token generation failed');
  }
};

export { generateAccessToken };
