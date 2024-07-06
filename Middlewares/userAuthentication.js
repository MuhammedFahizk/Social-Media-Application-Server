import jwt from "jsonwebtoken";

export const userAuthentication = (req, res, next) => {
  console.log("Cookies:", req.cookies);
  console.log("Headers:", req.headers);
  const { accessToken, refreshToken } = req.cookies;
  
  if (!accessToken) {
    console.log("User is not Authenticated");
    if (!refreshToken) {
      return res.status(401).json({
        message: "User is not Authenticated",
      });
    }
  }

  else {
    try {
      const decode = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      console.log("User is Authenticated", decode);
      if (decode.isAdmin === true) {
        return res.status(401).json({
          message: "Admin access not allowed",
        });
      }
      // Proceed to the next middleware or route handler
    } catch (error) {
      console.log("Invalid token", error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: "Token expired",
        });
      }
      return res.status(401).json({
        message: "Invalid token",
      });
    }    
  }
  next();

};
