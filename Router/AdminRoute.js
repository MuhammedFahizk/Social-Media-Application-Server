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
} from '../controller/Admin.js';
import { adminAuthentication } from '../Middlewares/adminAuthentication.js';
const router = Router();

// Define your routes
router.post('/login', adminLogin);
router.post('/generateAccessToken', generateAccessToken);
router.post('/loginWithGoogle', loginWithGoogle);
router.post('/verifyAdmin',adminAuthentication, verifyAdmin);
router.get('/users', usersList);
router.get('/users/:id', fetchUser);
router.get('/blockUser/:id', blockUser);
router.get('/unblockUser/:id', unblockUser);
router.get('/fetchPosts/:value',fetchPosts);
router.get('/fetchPost/:postId',fetchPost);
router.get('/fetchDashBoard',fetchDashBoard);
export default router;
