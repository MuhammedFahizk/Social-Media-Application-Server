import jwt from "jsonwebtoken";

export const adminAuthentication = (req, res, next) => {
  console.log("Cookies:", req.cookies);
  console.log("Headers:", req.headers);
  const { accessToken, refreshToken } = req.cookies;
  if (!accessToken) {
    console.log("admin is not Authenticated");
    if (!refreshToken) {
      return res.status(401).json({
        message: "admin is not Authenticated",
      });
    }
  } else {
    try {
      const decode = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      console.log("admin is Authenticated", decode);
      if (!decode.isAdmin) {
        return res.status(401).json({
          message: "admin is not Authenticated",
        });
      }
    } catch (error) {
      console.log("Invalid token", error);
      return res.status(401).json({
        message: "Invalid token",
      });
    }
  }
  next();
};
