const Admin = require("../modal/AdminModel");
const jwt = require("jsonwebtoken");
const generateToken = async (user) => {
  try {
    const payload = { _id: user._id };
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "4m",
    });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_PRIVATE_KEY, {
      expiresIn: "14d",
    });
    const admin = await Admin.updateOne(
        { _id: user._id },
        { 
          $set: { 
            'token': refreshToken, 
          }
        }
      );
  
    return Promise.resolve({refreshToken, accessToken})
  } catch (err) {
    return Promise.reject(err);
  }
};

module.exports = {
    generateToken
}