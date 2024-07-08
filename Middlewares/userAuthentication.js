import jwt from 'jsonwebtoken';

export const userAuthentication = (req, res, next) => {
  console.log('Cookies:', req.cookies);
  console.log('Headers:', req.headers);
  
  const { accessToken, refreshToken } = req.cookies;

  if (!accessToken) {
    console.log('User is not Authenticated');
    if (!refreshToken) {
      return res.status(401).json({ message: 'User is not Authenticated' });
    } else {
      // Proceed to refresh token handling in the controller
      return next();
    }
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    console.log('User is Authenticated', decoded);
    
    if (decoded.isAdmin) {
      return res.status(401).json({ message: 'Admin access not allowed' });
    }

    req.user = decoded; // Attach user information to request object
    next();
  } catch (error) {
    console.log('Invalid token', error);
    if (error.name === 'TokenExpiredError') {
      // Proceed to refresh token handling in the controller
      return next();
    } else {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }
};
