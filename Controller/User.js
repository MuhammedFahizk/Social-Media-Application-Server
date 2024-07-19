import { generateUserAccessToken } from '../Utils/User/generateUserAccessToken.js';
import { generateUserToken } from '../Utils/User/generateUserToken.js';
import { verifyUserRefreshToken } from '../Utils/User/verifyUserRefreshToken.js';
import {
  userValidateEmailHelper,
  userSignUpHelper,
  userLoginHelper,
  userGoogleLoginHelper,
  googleLoginUser,
  logoutHelper,
  findSuggestion,
  followingHelper,
  profileHelper,
  unFollowingHelper,
  searchHelper,
} from '../helper/user.js';
import { User } from '../model/User.js';

const otpValidation = (req, res) => {
  const user = req.body;
  userValidateEmailHelper(user)
    .then((result) => {
      return res
        .status(200)
        .json({ message: 'otp send to user Email', result });
    })
    .catch((err) => {
      return res.status(400).json({ message: err.message, error: err });
    });
};

const userSignUp = async (req, res) => {
  try {
    const { ...user } = req.body;
    const data = await userSignUpHelper(user);
    const { accessToken, refreshToken } = await generateUserToken(data.user);

    res.cookie('accessToken', accessToken, {
      maxAge: 4 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set secure flag only in production
      sameSite: 'Strict',
    });

    res.cookie('refreshToken', refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });
    return res.status(200).json({
      message: 'User created successfully',
      accessToken,
    });
  } catch (error) {
    console.error('Error in user sign-up:', error);
    return res
      .status(400)
      .json({ error: error.message || 'Something went wrong' });
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
      console.error('Invalid Refresh token');
      return res.status(401).json({ message: 'Invalid Refresh token' });
    }

    // Generate new access token
    const { newAccessToken } = await generateUserAccessToken(user);
    console.error('newAccessToken:', newAccessToken);
    // Set cookies with new tokens
    res.cookie('accessToken', newAccessToken, {
      maxAge: 4 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set secure flag only in production
      sameSite: 'Strict',
    });
    return res.status(200).json({
      error: false,
      accessToken,
      refreshToken,
      message: 'User   is Available ',
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
    console.error(error);
    res.status(500).json({ error: true, message: error.message });
  }
};

const userLogin = async (req, res) => {
  try {
    const user = req.body;
    const data = await userLoginHelper(user);

    const { accessToken, refreshToken } = await generateUserToken(data);
    res.cookie('accessToken', accessToken, {
      maxAge: 4 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set secure flag only in production
      sameSite: 'Strict',
    });

    res.cookie('refreshToken', refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });
    const { userName, _id, profilePicture, email, bio,following, followers } = data;
    return res.status(200).json({
      message: 'User logged in',
      accessToken,
      user: {
        userName,
        _id,
        profilePicture,
        email,
        bio,
        following,
        followers,
      },
      refreshToken,
    });
  } catch (error) {
    console.error(error);
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    return res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
};

const loginWithGoogle = async (req, res) => {
  try {
    const result = await userGoogleLoginHelper(req.body.credential); // Await the promise
    googleLoginUser(result)
      .then(async (response) => {
        const { accessToken, refreshToken } = await generateUserToken(response);

        // Set cookies
        res.cookie('accessToken', accessToken, {
          maxAge: 4 * 60 * 1000, // 4 minutes
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Set secure flag only in production
          sameSite: 'Strict',
        });
        res.cookie('refreshToken', refreshToken, {
          maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
        });

        // Extract user data
        const { userName, _id, profilePicture, email, bio,following, followers } = response;

        // Respond with tokens and user data
        res.status(200).json({
          error: false,
          message: 'Admin logged in successfully',
          accessToken,
          refreshToken,
          user: {
            userName,
            _id,
            profilePicture,
            email,
            bio,
            following,
            followers
          },
        });
      })
      .catch((err) => {
        res.status(400).json({ error: true, message: err.message });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to authenticate' }); // Send a proper response on failure
  }
};

const logOutUser = (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res
    .status(401)
    .json({ error: true, message: 'User not authenticated ' });
  logoutHelper(refreshToken)
    .then((response) => {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.status(200).json({
        error: false,
        message: 'User logged out successfully, ',
        response,
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(400).json({ error: true, message: err.message });
    });
};
const homePage = (req, res) => {
  const { _id } = req.user;
  findSuggestion(_id)
    .then((data) => {
      res.status(200).json(data);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
};
const followUser = async (req,res) => {
  const { _id } = req.user;
  const { id } = req.params;
  followingHelper(_id,id)
    .then((response) => {
      return res.status(200).json(response);
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error'});
    });
};

const unFollowUser = async (req,res) => {
  const { _id } = req.user;
  const { id } = req.params;
  console.log(id, _id);
  unFollowingHelper(_id,id)
    .then((response) => {
      return res.status(200).json(response);
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error'});
    });
};


function logWithTimestamp(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

const profile = (req, res) => {
  // Validate request parameters
  if (!req.user || !req.params.id) {
    return res.status(400).json({ error: 'Missing required user information.' });
  }

  const { _id } = req.user;
  logWithTimestamp('User ID extracted from user object');
  const { id } = req.params;
  logWithTimestamp(`Profile ID extracted from params: ${id}`);

  // Determine which ID to use
  const userId = id ? id : _id;
  logWithTimestamp(`Using user ID: ${userId}`);

  profileHelper(userId)
    .then((response) => {
      logWithTimestamp('Profile data retrieved successfully');
      res.status(200).json(response);
    })
    .catch((error) => {
      logWithTimestamp(`Failed to retrieve profile data: ${error.message}`);
      // Provide more specific error responses based on the error type
      if (error) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    });
};

const userProfile = async (req,res) => {
  const { _id } = req.user;
  profileHelper(_id)
    .then((response) => {
      logWithTimestamp('Profile data retrieved successfully');
      res.status(200).json(response);
    })
    .catch((error) => {
      logWithTimestamp(`Failed to retrieve profile data: ${error.message}`);
      // Provide more specific error responses based on the error type
      if (error) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    });
};

const userSearch = (req,res) => { 
  try {
    const { value} = req.params;
    console.log(req.user);
    const { _id } = req.user;
    console.log('value',value);
    searchHelper(_id, value)
      .then((response) => {
        console.log(response);
        return res.status(200).json({message:'search success',response });
      })
      .catch((error) => {
        return res.status(500).json({message:'search failed',error });
      });
  } catch (error) {
    console.log('error',error);
    return res.status(500).json({message: 'internal server error', error})
  }
};
export {
  userSignUp,
  verifyUser,
  generateAccessToken,
  userLogin,
  loginWithGoogle,
  otpValidation,
  logOutUser,
  homePage,
  followUser,
  profile,
  userProfile,
  unFollowUser,
  userSearch,

};
