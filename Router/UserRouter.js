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
  unFollowUser,
  userSearch,
  uploadProfile,
  createPost,
  uploadImageCloud,
  deleteImage,
  createStory,
  fetchPost,
  likePost,
  unLikePost,
  commentPost,
  fetchPosts,
  deletePost,
  fetchConnections,
  deleteComment,
  getFreshStories,
  incrementViewerCount,
  fetchProfileStores,
  updatePost,
  fetchSuggestions,
  fetchUserNotifications,
  editProfile,
  hideContent,
  fetchHideUsers,
  fetchHidePosts,
  unHideContent,
  resetPassword
} from '../controller/User.js';

import express from 'express';
import { userAuthentication, userProtectedRoutes } from '../Middlewares/userAuthentication.js';
import multer from 'multer';
const upload = multer({ dest: 'uploads/' }); 

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
router.get('/unFollowUser/:id',userProtectedRoutes, unFollowUser);
router.get('/profile/:id', userProtectedRoutes, profile);
router.get('/profile', userProtectedRoutes, userProfile);
router.get('/search/:value', userProtectedRoutes, userSearch);
router.post('/profile/upload', userProtectedRoutes,upload.single('file'), uploadProfile);
router.post('/createPost/:content', userProtectedRoutes, createPost);
router.post('/createStory/:content', userProtectedRoutes, createStory);
router.post('/uploadImage', userProtectedRoutes,upload.single('file'),  uploadImageCloud);
router.post('/deleteImage', userProtectedRoutes, deleteImage);
router.get('/post/:id', userProtectedRoutes, fetchPost);
router.get('/likePost/:id', userProtectedRoutes, likePost);
router.delete('/unLikePost/:id', userProtectedRoutes, unLikePost);
router.post('/commentPost/:id', userProtectedRoutes, commentPost);
router.get('/fetchPosts/:heading/:offset', userProtectedRoutes, fetchPosts);
router.delete('/deletePost/:id',userProtectedRoutes, deletePost);
router.get('/connections/:id', userProtectedRoutes, fetchConnections);
router.delete('/deleteComment',userProtectedRoutes, deleteComment);
router.get('/getFreshStories/',userProtectedRoutes, getFreshStories);
router.post('/incrementViewerCount', userProtectedRoutes, incrementViewerCount);
router.get('/fetchProfileStores/:userId',userProtectedRoutes, fetchProfileStores);
router.post('/edit-profile',userProtectedRoutes,editProfile);
router.put('/updatePost', userProtectedRoutes,updatePost);
router.get('/fetchSuggestions/:offset', userProtectedRoutes,fetchSuggestions);
router.get('/fetchUserNotifications',userProtectedRoutes,fetchUserNotifications);
router.post('/hide-content',userProtectedRoutes,hideContent);
router.post('/unHide-content',userProtectedRoutes,unHideContent);
router.get('/hide-users',userProtectedRoutes,fetchHideUsers);
router.get('/hide-posts',userProtectedRoutes,fetchHidePosts);
router.post('/reset-password',userProtectedRoutes, resetPassword)
export default router;
