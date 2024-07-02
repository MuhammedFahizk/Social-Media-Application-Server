export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;

    const { accessToken } = req.cookie;
    const { refreshToken } = req.cookie;
    console.log(accessToken, refreshToken);

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid Token" });
  }
};
