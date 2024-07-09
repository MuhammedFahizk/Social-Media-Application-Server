import jwt from 'jsonwebtoken';

export const adminAuthentication = (req, res, next) => {

  const { accessToken, refreshToken } = req.cookies;
  if (!accessToken) {
    if (!refreshToken) {
      return res.status(401).json({
        message: 'admin is not Authenticated',
      });
    }
  } else {
    try {
      const decode = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      if (!decode.isAdmin) {
        return res.status(401).json({
          message: 'admin is not Authenticated',
        });
      }
    } catch (error) {
      console.error('Invalid token', error);
      return res.status(401).json({
        message: 'Invalid token',
      });
    }
  }
  next();
};
