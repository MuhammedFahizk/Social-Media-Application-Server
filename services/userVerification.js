import { User } from '../model/User.js';
import { generateUserAccessToken } from '../utils/User/generateUserAccessToken.js';

export const userVerification = async (req, res) => {
  const { refreshToken } = req.cookies;
  
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token is required' });
  }
  
  try {
    const user = await User.findOne({ token: refreshToken });
  
    if (!user) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Invalid Refresh token' });
    }
  
    const { newAccessToken } = await generateUserAccessToken(user);
  
    res.cookie('accessToken', newAccessToken, {
      maxAge: 4 * 60 * 1000, // 4 minutes
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });
    req.cookies.accessToken = newAccessToken; // Set new access token in request cookies
    return true; // Indicate success
  } catch (err) {
    console.error('Error verifying user:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

