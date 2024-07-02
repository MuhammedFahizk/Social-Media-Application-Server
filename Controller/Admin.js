import { adminGoogleLoginHelper, adminLoginHelper, googleLoginAdmin } from '../helper/admin.js';
import  {generateToken}  from '../Utils/admin/generateTokens.js';
import { verifyAdminRefreshToken  } from '../Utils/admin/verifyAdminRefreshToken.js';

// Define your controller functions

const adminLogin = async (req, res) => {
  try {
    const result = await adminLoginHelper(req.body);

    console.warn('Admin logged in:');

    const { accessToken, refreshToken } = await generateToken(result);

    res.status(200).json({
      error: false,
      accessToken,
      refreshToken,
      message: 'Admin logged in successfully',
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
     .then(async(response) => {
      const { accessToken, refreshToken } = await generateToken(response); 
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

export {
  adminLogin,
  loginWithGoogle,
  generateAccessToken,
};
