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
  userProfileHelper,
  uploadProfileHelper,
  createPostHelper,
  createStoryHelper,
} from '../helper/user.js';
import { User } from '../model/User.js';
import { deleteImageCloudinary } from '../services/deleteImageCloudinary.js';
import { uploadImageCloudinary } from '../services/uploadImageCloudinary.js';

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
  unFollowingHelper(_id,id)
    .then((response) => {
      return res.status(200).json(response);
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error'});
    });
};


const profile = (req, res) => {
  // Validate request parameters
  if (!req.user || !req.params.id) {
    return res.status(400).json({ error: 'Missing required user information.' });
  }

  const { _id } = req.user;
  const { id } = req.params;

  // Determine which ID to use
  // const userId = id ? id : _id;

  profileHelper(id, _id)
    .then((response) => {
      res.status(200).json(response);
    })
    .catch((error) => {
      // Provide more specific error responses based on the error type
      if (error) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    });
};

const userProfile = async (req,res) => {
  const { _id } = req.user;
  userProfileHelper(_id)
    .then((response) => {
      res.status(200).json(response);
    })
    .catch((error) => {
      // Provide more specific error responses based on the error type
      if (error) {
        console.error(error);
        return res.status(404).json({ error: 'Profile not found' });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    });
};

const userSearch = (req, res) => {
  try {
    // Extracting parameters
    const { value } = req.params;
    const { _id } = req.user;
    const { item, offset } = req.query;

    // Call the search helper function
    searchHelper(_id, value, item, offset)
      .then((response) => {
        // On successful search, format the response
        return res.status(200).json({
          message: 'Search successful',
          data: response,
          timestamp: Date.now(), // Optional: Include a timestamp for tracking
        });
      })
      .catch((error) => {
        // Handle errors from the search helper
        console.error('Error in searchHelper:', error); // Log the error for debugging
        return res.status(500).json({
          message: 'Search failed',
          error: error.message, // Include the error message in the response
          timestamp: Date.now(),
        });
      });
  } catch (error) {
    // Handle unexpected errors in the route handler
    console.error('Unexpected error in userSearch:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
      timestamp: Date.now(),
    });
  }
};


const uploadProfile = (req, res) => {
  const { file } = req; // Assuming 'file' is the field name for the uploaded file
  const { _id } = req.user;
  try {
    uploadProfileHelper(_id, file)
      .then((response) => {
        return res.status(200).json({ message: 'upload success', response });
      })
      .catch((error) => {
        return res.status(500).json({ message: 'upload failed', error });
      });
  } catch (error) {
    return res.status(500).json({ message: 'internal server error', error });
  }
};
const createPost =  async(req, res) => {
  try {
    const {content} = req.params;
    const { _id } = req.user;
    const  body   = req.body;
    console.log(req.body);
    createPostHelper(body, content, _id)
      .then((response) => {
        return res.status(200).json({ message: 'post success', response });
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).json({ message: 'post failed', error });
      });
  } catch (error) { 
    console.log(error);
    return res.status(500).json({ message: 'internal server error', error }); 
  }
};
const createStory =  async(req, res) => {
  try {
    const {content} = req.params;
    const { _id } = req.user;
    const  body   = req.body;
    console.log(req.body);
    createStoryHelper(body, content, _id)
      .then((response) => {
        return res.status(200).json({ message: 'post success', response });
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).json({ message: 'post failed', error });
      });
  } catch (error) { 
    console.log(error);
    return res.status(500).json({ message: 'internal server error', error }); 
  }
};
const uploadImageCloud = (req, res) => {
  try {
    const { image } = req.body;
    console.log(req.file);
    uploadImageCloudinary(req.file)
      .then((response) => {
        return res.status(200).json({ message: 'upload success', response });
      })
      .catch((error) => {
        return res.status(500).json({ message: 'upload failed', error });
      });
  
  } catch (error) {
    return res.status(500).json({ message: 'internal server error', error });
  
  }
};
const deleteImage = async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'No URL provided' });
  }

  try {
    const publicId = extractPublicId(url);
    console.log('Public ID:', publicId);

    const result = await deleteImageCloudinary(publicId);
    console.log('Result:', result);
    // Check the result to confirm deletion
    if (result.result === 'ok') {
      res.status(200).json({ message: 'Image deleted successfully' });
    } else {
      res.status(400).json({ message: 'Image deletion failed', result });
    }
  } catch (error) {
    console.error('Error deleting image:', error); // Log full error
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const extractPublicId = (url) => {
  try {
    // Assuming URL structure like http://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
    const urlParts = new URL(url);
    const pathParts = urlParts.pathname.split('/');
    return pathParts[pathParts.length - 1].split('.')[0];
  } catch (error) {
    throw new Error('Invalid URL format');
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
  uploadProfile,
  createPost,
  createStory,
  uploadImageCloud,
  deleteImage,
};
