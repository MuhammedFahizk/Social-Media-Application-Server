import {
  adminGoogleLoginHelper,
  adminLoginHelper,
  googleLoginAdmin,
  usersHelper,
  fetchUserHelper,
  unblockUserHelper,
  blockUserHelper,
  fetchPostsHelper,
  fetchPostHelper,
  fetchDashBoardHelper,
  sendNotificationHelper,
  logoutHelper,
  fetchAdminHelper,
  migrateIsBlockedField,
} from '../helper/admin.js';
import {
  generateAdminAccessToken,
  generateToken,
} from '../Utils/admin/generateTokens.js';
import { verifyAdminRefreshToken } from '../Utils/admin/verifyAdminRefreshToken.js';
import Admin from '../model/AdminModel.js';
// Define your controller functions


const adminLogin = async (req, res) => {
  try {
    const result = await adminLoginHelper(req.body);
    const { accessToken, refreshToken } = await generateToken(result);

    res.cookie('accessToken', accessToken, {
      maxAge: 60 * 1000,
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

    res.status(200).json({
      error: false,
      message: 'Admin logged in successfully',
      data: result,
    });
  } catch (err) {
    console.error('Error while logging in admin:', err);

    if (err.message === 'Invalid credentials') {
      res.status(400).json({ error: true, message: 'Invalid credentials' });
    } else {
      res.status(500).json({ error: true, message: err.message });
    }
  }
};

const fetchAdmin = (req, res) => {
  try {
    // const adminId = req.adminId; // Use this if you need to filter by a specific admin ID.
    
    fetchAdminHelper()
      .then((result) => {
        res.status(200).json({
          error: false,
          message: 'Admin fetched successfully',
          result
        });
      })
      .catch((error) => {
        res.status(500).json({
          error: true,
          message: 'Failed to fetch admin',
          details: error.message,
        });
      });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'An unexpected error occurred',
      details: error.message,
    });
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

const generateAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    verifyAdminRefreshToken(refreshToken)
      .then((result) => {
        res.status(200).json({
          accessToken: result.accessToken,
        });
      })
      .catch((err) => {
        res.status(400).json({ error: true, message: err.message });
      });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

const loginWithGoogle = async (req, res) => {
  try {
    const result = await adminGoogleLoginHelper(req.body.credential); // Await the promise
    googleLoginAdmin(result)
      .then(async (response) => {
        const { accessToken, refreshToken } = await generateToken(response);
        res.cookie('accessToken', accessToken, {
          maxAge: 60 * 1000, // 1 MInit
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

        res.status(200).json({
          error: false,
          message: 'Admin logged in successfully',
        });
      })
      .catch((err) => {
        console.error(err);
        res.status(400).json({ error: true, message: err.message });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to authenticate' }); // Send a proper response on failure
  }
};

const verifyAdmin = async (req, res) => {
  const { accessToken, refreshToken } = req.cookies;

  try {
    // Check if accessToken exists
    if (accessToken) {
      return res.status(200).json({ message: 'Admin is authenticated' });
    }

    // If accessToken is not present, check refreshToken
    const admin = await Admin.findOne({ token: refreshToken });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid Refresh token' });
    }

    // Generate new access token
    const { newAccessToken } = await generateAdminAccessToken(admin);

    // Set cookies with new tokens
    res.cookie('accessToken', newAccessToken, {
      maxAge: 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set secure flag only in production
      sameSite: 'Strict',
    });
    return res.status(200).json({
      error: false,
      accessToken,
      refreshToken,
      message: 'Admin   is Available ',
    });
  } catch (err) {
    console.error('Error verifying Admin:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
const usersList = async (req, res) => {
  try {
    usersHelper()
      .then((data) => {
        return res.status(200).json({ data: data, message: 'Users List' });
      })
      .catch((err) => {
        return res.status(500).json({ message: 'Internal Server Error', err });
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to authenticate' });
  }
};

const fetchUser = (req, res) => {
  const { id } = req.params;
  try {
    fetchUserHelper(id)
      .then((data) => {
        return res.status(200).json({ data: data, message: 'User Details' });
      })
      .catch((err) => {
        return res.status(500).json({ message: 'Internal Server Error', err });
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to authenticate' });
  }
};

const blockUser = (req, res) => {
  const { id } = req.params;
  blockUserHelper(id)
    .then((data) => {
      return res.status(200).json({ data: data, message: 'User Blocked' });
    })
    .catch((err) => {
      console.log(err);
      
      return res.status(500).json({ message: 'Internal Server Error', err });
    });
};
const unblockUser = (req, res) => {
  const { id } = req.params;
  unblockUserHelper(id)
    .then((data) => {
      return res.status(200).json({ data: data, message: 'User Blocked' });
    })
    .catch((err) => {
      return res.status(500).json({ message: 'Internal Server Error', err });
    });
};
const fetchPosts = (req, res) => {
  const { value } = req.params;
  const { search } = req.query;
  fetchPostsHelper(value, search)
    .then((response) => {
      res.status(200).json(response);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    });
};
const fetchPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await fetchPostHelper(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(200).json(post);
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    res
      .status(500)
      .json({ message: 'An error occurred', error: error.message });
  }
};

const fetchDashBoard = async (req, res) => {
  fetchDashBoardHelper()
    .then((data) => {
      return res.status(200).json({ data, message: 'Dashboard Fetched' });
    })
    .catch((err) => {
      return res.status(500).json({ message: 'Internal Server Error', err });
    });
};

const sendNotification = async (req, res) => {
  const { message, recipients } = req.body;
  try {
    await sendNotificationHelper(message, recipients, req.admin._id, req.io);
    return res.status(200).json({ message: 'Notification Sent' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};
export {
  verifyAdmin,
  adminLogin,
  fetchAdmin,
  loginWithGoogle,
  generateAccessToken,
  usersList,
  fetchUser,
  unblockUser,
  blockUser,
  fetchPosts,
  fetchPost,
  fetchDashBoard,
  //Notification
  sendNotification,
  logOutUser,
};
