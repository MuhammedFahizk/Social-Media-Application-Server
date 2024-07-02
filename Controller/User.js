import {generateUserToken} from "../Utils/User/generateUserToken.js";
import { verifyUserRefreshToken } from "../Utils/User/verifyUserRefreshToken.js";
import  {userSignUpHelper, userLoginHelper, userGoogleLoginHelper, googleLoginUser}  from "../helper/user.js";

const userSignUp = (req, res) => {
  try {
    const { ...user } = req.body;
    userSignUpHelper(user)
      .then(async (data) => {
        const { accessToken, refreshToken } = await generateUserToken(data);
        console.log(
            'sdfd',
            accessToken, refreshToken
        );
        return res
          .status(200)
          .json({ message: "user created", accessToken, refreshToken });
      })
      .catch((err) => {
        console.log(err);
        return res.status(400).json(err);
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "internal server Error", error });
  }
};

const generateAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    verifyUserRefreshToken(refreshToken)
      .then((result) => {
        res.status(200).json({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
      })
      .catch((err) => {
        res.status(400).json({ error: true, message: err.message });
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: true, message: error.message });
  }
};

const userLogin = async (req, res) => {
  try {
    const user = req.body;
    const data = await userLoginHelper(user);

    const { accessToken, refreshToken } = await generateUserToken(data);

    return res.status(200).json({ message: "User logged in", accessToken, refreshToken });
  } catch (error) {
    console.error(error);
    if (error.message === "Invalid credentials") {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const loginWithGoogle = async (req, res) => {
  try {
    const result = await userGoogleLoginHelper(req.body.credential); // Await the promise
    googleLoginUser(result)
     .then(async(response) => {
      const { accessToken, refreshToken } = await generateUserToken(response); 
      res.status(200).json({
        error: false,
        accessToken,
        refreshToken,
        message: 'Admin logged in successfully',
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(400).json({ error: true, message: err.message });
        });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to authenticate' }); // Send a proper response on failure
  }
};


export { userSignUp, generateAccessToken, userLogin, loginWithGoogle };
