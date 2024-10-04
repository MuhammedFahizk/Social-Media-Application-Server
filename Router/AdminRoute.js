import { Router } from 'express';
import {
  adminLogin,
  generateAccessToken,
  loginWithGoogle,
  verifyAdmin,
  usersList,
  fetchUser,
  blockUser,
  unblockUser,
  fetchPosts,
  fetchPost,
  fetchDashBoard,
  sendNotification,
  logOutUser,
} from '../controller/Admin.js';
import { adminAuthentication } from '../Middlewares/adminAuthentication.js';
const router = Router();

// Define your routes
router.post('/login', adminLogin);
router.get('/logOut', logOutUser);

router.post('/generateAccessToken', generateAccessToken);
router.post('/loginWithGoogle', loginWithGoogle);
router.post('/verifyAdmin',adminAuthentication, verifyAdmin);
router.get('/users', adminAuthentication,usersList);
router.get('/users/:id',adminAuthentication, fetchUser);
router.get('/blockUser/:id',adminAuthentication, blockUser);
router.get('/unblockUser/:id',adminAuthentication, unblockUser);
router.get('/fetchPosts/:value',adminAuthentication,fetchPosts);
router.get('/fetchPost/:postId',adminAuthentication,fetchPost);
router.get('/fetchDashBoard',adminAuthentication,fetchDashBoard);

// notification
router.post('/send-Notification',adminAuthentication,sendNotification);
export default router;
