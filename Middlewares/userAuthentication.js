import jwt from 'jsonwebtoken';
import { userVerification } from '../services/userVerification.js';
import { generateUserAccessToken } from '../Utils/User/generateUserAccessToken.js';
export const userAuthentication = (req, res, next) => {

  
  const { accessToken, refreshToken } = req.cookies;

  if (!accessToken) {
    if (!refreshToken) {
      return res.status(401).json({ message: 'User is not Authenticated' });
    } else {
      // Proceed to refresh token handling in the controller
      return next();
    }
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    console.log(decoded);
    if (decoded.isAdmin) {
      return res.status(401).json({ message: 'Admin access not allowed' });
    }

    req.user = decoded; // Attach user information to request object
    next();
  } catch (error) {
    console.error('Invalid token', error);
    if (error.name === 'TokenExpiredError') {
      // Proceed to refresh token handling in the controller
      return next();
    } else {
      return res.status(401).json({ message: 'Invalid token' });
    }
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

    // After verification, check the new accessToken
    
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
