import jwt from 'jsonwebtoken';

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
  const { accessToken } = req.cookies;

  if (!accessToken) {
    return res.status(401).json({ message: 'Access token is required' });
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    if (decoded.isAdmin) {
      return res.status(403).json({ message: 'Admin access not allowed' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid access token' });
  }
};

