import {
  userSignUp,
  verifyUser,
  homePage,
  generateAccessToken,
  otpValidation,
  userLogin,
  logOutUser,
  loginWithGoogle,
  followUser,
  profile,
  userProfile,
} from '../controller/User.js';
import express from 'express';
import { userAuthentication, userProtectedRoutes } from '../Middlewares/userAuthentication.js';
const router = express.Router();
router.post('/otpValidation', otpValidation);
router.post('/signUp', userSignUp);
router.post('/generateAccessToken', generateAccessToken);
router.post('/verifyUser', userAuthentication, verifyUser);
router.post('/login', userLogin);
router.post('/loginWithGoogle', loginWithGoogle);
router.post('/logOutUser', logOutUser);
router.get('/homePage',userProtectedRoutes,  homePage);
router.get('/followUser/:id',userProtectedRoutes, followUser);
router.get('/profile/:id', userProtectedRoutes, profile);
router.get('/profile', userProtectedRoutes, userProfile);


export default router;
