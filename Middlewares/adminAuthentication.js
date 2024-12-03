import jwt from 'jsonwebtoken';
import { generateAccessToken } from '../utils/admin/generateAccessToken.js';

export const adminAuthentication = async (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies;
  console.log(accessToken);
  if (!accessToken) {
    if (!refreshToken) {
      return res.status(401).json({
        message: 'admin is not Authenticated',
      });
    }
    const {newAccessToken} = await generateAccessToken(refreshToken);
    res.cookie('accessToken', newAccessToken, {
      maxAge: 4 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set secure flag only in production
      sameSite: 'Strict',
    });
  console.log('accessToken', newAccessToken);

    const decode = jwt.verify(newAccessToken, process.env.ACCESS_TOKEN_SECRET);
    req.admin = decode;
  } else {
    try {
      const decode = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      console.log('decode',decode);
      if (!decode.isAdmin) {
        return res.status(401).json({
          message: 'admin is not Authenticated',
        });
      }
      req.admin = decode;
    } catch (error) {
      console.error('Invalid token', error);
      return res.status(401).json({
        message: 'Invalid token',
      });
    }
  }
  next();
};
