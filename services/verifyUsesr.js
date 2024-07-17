import { User } from '../model/User';
import { generateUserAccessToken } from '../Utils/User/generateUserAccessToken';

export const verifyUser = async (req, res) => {
  const { accessToken, refreshToken } = req.cookies;
  
  try {
    // Check if accessToken exists
    if (accessToken) {
      return res.status(200).json({ message: 'User is authenticated' });
    }
  
    // If accessToken is not present, check refreshToken
    const user = await User.findOne({ token: refreshToken });
  
    if (!user) {
      console.error('Invalid Refresh token');
      return res.status(401).json({ message: 'Invalid Refresh token' });
    }
  
    // Generate new access token
    const { newAccessToken } = await generateUserAccessToken(user);
    console.error('newAccessToken:', newAccessToken);
    // Set cookies with new tokens
    res.cookie('accessToken', newAccessToken, {
      maxAge: 4 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set secure flag only in production
      sameSite: 'Strict',
    });
    return res.status(200).json({
      error: false,
      accessToken,
      refreshToken,
      message: 'User   is Available ',
    });
  } catch (err) {
    console.error('Error verifying user:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};