import { generateUserAccessToken } from "../Utils/User/generateUserAccessToken.js";
import { generateUserToken } from "../Utils/User/generateUserToken.js";
import { verifyUserRefreshToken } from "../Utils/User/verifyUserRefreshToken.js";
import {
  userValidateEmailHelper,
  userSignUpHelper,
  userLoginHelper,
  userGoogleLoginHelper,
  googleLoginUser,
} from "../helper/user.js";
import {User} from '../model/User.js';


const otpValidation = (req, res) => {
  const user = req.body;
  userValidateEmailHelper(user)
    .then((result) => {
      return res.status(200).json({ message: "otp send to user Email" });
    })
    .catch((err) => {
      return res
        .status(400)
        .json({ message: "Email is not valid", error: err });
    });
};

const userSignUp = async (req, res) => {
  try {
    const { ...user } = req.body;
    const data = await userSignUpHelper(user);
    console.log("data:", data);
    // Generate tokens for the newly signed-up user
    const { accessToken, refreshToke } = generateUserToken(data.user);

    console.log("Access Token:", accessToken);
    res.cookie("accessToken", accessToken, {
      maxAge: 4 * 60 *1000 ,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Set secure flag only in production
      sameSite: "Strict",
    });

    res.cookie("refreshToken", refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
    return res.status(200).json({
      message: "User created successfully",
      accessToken,
    });
  } catch (error) {
    console.error("Error in user sign-up:", error);
    return res
      .status(400)
      .json({ error: error.message || "Something went wrong" });
  }
};

const verifyUser = async (req, res) => {
  const { accessToken, refreshToken } = req.cookies;

  try {
    // Check if accessToken exists
    if (accessToken) {
      return res.status(200).json({ message: 'User is authenticated' });
    }

    // If accessToken is not present, check refreshToken
    const user = await User.findOne({ token: refreshToken });

    if (!user) {
      console.log('Invalid Refresh token');
      return res.status(401).json({ message: 'Invalid Refresh token' });
    }

    // Generate new access token
    const {  newAccessToken } = await generateUserAccessToken(user);
    console.log(newAccessToken);
    console.log("newAccessToken:", newAccessToken);
    // Set cookies with new tokens
    res.cookie("accessToken", newAccessToken, {
      maxAge: 4 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Set secure flag only in production
      sameSite: "Strict",
    });
    return res.status(200).json({
      error: false,
      accessToken,
      refreshToken,
      message: "User   is Available ",
    });
  } catch (err) {
    console.error('Error verifying user:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
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
    console.log(user);
    const data = await userLoginHelper(user);

    const { accessToken, refreshToken } = await generateUserToken(data);
    res.cookie("accessToken", accessToken, {
      maxAge: 4 * 60 *1000 ,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Set secure flag only in production
      sameSite: "Strict",
    });

    res.cookie("refreshToken", refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
    return res
      .status(200)
      .json({ message: "User logged in", accessToken, refreshToken });
  } catch (error) {
    console.error(error);
    if (error.message === "Invalid credentials") {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const loginWithGoogle = async (req, res) => {
  try {
    const result = await userGoogleLoginHelper(req.body.credential); // Await the promise
    googleLoginUser(result)
      .then(async (response) => {
        const { accessToken, refreshToken } = await generateUserToken(response);
        res.cookie("accessToken", accessToken, {
          maxAge: 4 * 60 *1000 ,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // Set secure flag only in production
          sameSite: "Strict",
        });

        res.cookie("refreshToken", refreshToken, {
          maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Strict",
        });
        res.status(200).json({
          error: false,
          accessToken,
          refreshToken,
          message: "Admin logged in successfully",
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(400).json({ error: true, message: err.message });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to authenticate" }); // Send a proper response on failure
  }
};

export {
  userSignUp,
  verifyUser,
  generateAccessToken,
  userLogin,
  loginWithGoogle,
  otpValidation,
};
