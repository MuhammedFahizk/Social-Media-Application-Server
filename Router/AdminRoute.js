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
  fetchAdmin,
  getAllReports,
  dismissReport,
  banUserAndResolveReport,
  deletePostAndResolveReport,
} from '../controller/Admin.js';
import { adminAuthentication } from '../middlewares/adminAuthentication.js';
const router = Router();

// Define your routes
router.post('/login', adminLogin);
router.get('/logOut', logOutUser);

router.post('/generateAccessToken', generateAccessToken);
router.post('/loginWithGoogle', loginWithGoogle);
router.post('/verifyAdmin',adminAuthentication, verifyAdmin);
router.get('/admin',adminAuthentication,fetchAdmin);

router.get('/users', adminAuthentication,usersList);
router.get('/users/:id',adminAuthentication, fetchUser);
router.get('/blockUser/:id',adminAuthentication, blockUser);
router.get('/unblockUser/:id',adminAuthentication, unblockUser);
router.get('/fetchPosts/:value',adminAuthentication,fetchPosts);
router.get('/fetchPost/:postId',adminAuthentication,fetchPost);
router.get('/fetchDashBoard',adminAuthentication,fetchDashBoard);

// notification
router.post('/send-Notification',adminAuthentication,sendNotification);

// **New Routes for Report Management**

router.get('/reports', adminAuthentication,getAllReports); 
// router.get('/reports/:id', adminAuthentication, getReportById);
router.put('/reports/:reportId/:postId/delete-post', adminAuthentication, deletePostAndResolveReport);
router.put('/reports/:reportId/:postId/ban-user', adminAuthentication, banUserAndResolveReport); 
router.put('/reports/:reportId/:postId/dismiss', adminAuthentication, dismissReport);

export default router;
 