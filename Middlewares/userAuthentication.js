import jwt from 'jsonwebtoken';
import { userVerification } from '../services/userVerification.js';
import { generateUserAccessToken } from '../Utils/User/generateUserAccessToken.js';
import { User } from '../model/User.js';


export const userAuthentication = async (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies;

  try {
    // Check if refreshToken is missing
    if (!refreshToken) {
      return res.status(401).json({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required.',
        }
      });
    }

    // Find the user by the refresh token
    const user = await User.findOne({ token: refreshToken });
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'The refresh token is invalid.',
        }
      });
    }

    // Check if user is blocked
    if (user.isBlocked.status) {
      return res.status(403).json({
        error: {
          code: 'USER_BLOCKED',
          message: 'The user account is blocked and cannot perform this action.',
          details: 'Please contact support for further assistance.',
        }
      });
    }

    // If accessToken exists, try to verify it
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded; 
        if (decoded.isAdmin) {
          return res.status(403).json({ message: 'Admin access not allowed' });
        }
        return next();
      } catch (error) {
        if (error.name !== 'TokenExpiredError') {
          return res.status(401).json({
            error: {
              code: 'INVALID_ACCESS_TOKEN',
              message: 'The access token is invalid.',
            }
          });
        }
      }
    }

    const { newAccessToken } = await generateUserAccessToken(user);

    res.cookie('accessToken', newAccessToken, {
      maxAge: 4 * 60 * 1000, 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'Strict',
    });

    req.user = jwt.decode(newAccessToken); // Attach new token info to request
    next(); // Proceed with the newly generated access token
  } catch (err) {
    console.error('Error verifying user:', err);
    return res.status(500).json({ 
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error',
      }
    });
  }
};


export const userProtectedRoutes = async (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies;

  if (!accessToken) {
    if (!refreshToken) {
      return res.status(401).json({ message: 'Access token is required' });
    }

    // Call userVerification to handle refresh token
    const verificationResult = await userVerification(req, res);
    if (verificationResult !== true) {
      return; // userVerification will handle the response
    }

    
  }

  try {
    const decoded = jwt.verify(req.cookies.accessToken, process.env.ACCESS_TOKEN_SECRET);

    if (decoded.isAdmin) {
      return res.status(403).json({ message: 'Admin access not allowed' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next();
    } else {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }
};
