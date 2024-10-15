import express from 'express';
import multer from 'multer';
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
  resetPassword,
  reportPost,
  fetchChats,
  sendMessage,
  fetchChatList,
  readMessage,
  clearChat,
  deleteForMe,
  deleteForEveryone,
  getStories
} from '../controller/User.js';

import { userAuthentication } from '../middlewares/userAuthentication.js';

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

// Public routes
router.post('/signUp', userSignUp);
router.post('/login', userLogin);
router.post('/loginWithGoogle', loginWithGoogle);
router.post('/otpValidation', otpValidation);
router.post('/generateAccessToken', generateAccessToken);

// Protected routes
router.use(userAuthentication);

router.get('/homePage', homePage);
router.post('/verifyUser',  verifyUser);
router.post('/logOutUser', logOutUser);

// Profile-related routes
router.get('/profile/:id', profile);
router.get('/profile', userProfile);
router.post('/profile/upload', upload.single('file'), uploadProfile);
router.post('/edit-profile', editProfile);

// User interaction routes
router.get('/followUser/:id', followUser);
router.get('/unFollowUser/:id', unFollowUser);
router.get('/search/:value', userSearch);

// Post and Story routes
router.post('/createPost/:content', createPost);
router.post('/createStory/:content', createStory);
router.post('/uploadImage', upload.single('file'), uploadImageCloud);
router.post('/deleteImage', deleteImage);
router.get('/post/:id', fetchPost);
router.get('/likePost/:id', likePost);
router.delete('/unLikePost/:id', unLikePost);
router.post('/commentPost/:id', commentPost);
router.get('/fetchPosts/:heading/:offset', fetchPosts);
router.delete('/deletePost/:id', deletePost);
router.put('/updatePost', updatePost);

// Connection-related routes
router.get('/connections/:id', fetchConnections);
router.get('/fetchSuggestions/:offset', fetchSuggestions);

// Comment-related routes
router.delete('/deleteComment', deleteComment);

// Story-related routes
router.get('/getFreshStories/', getFreshStories);
router.get('/getFreshStories/:userName/:storyId', getStories);
router.post('/incrementViewerCount', incrementViewerCount);
router.get('/fetchProfileStores/:userId', fetchProfileStores);

// Notification-related routes
router.get('/fetchUserNotifications', fetchUserNotifications);

// Hide/unhide content routes
router.post('/hide-content', hideContent);
router.post('/unHide-content', unHideContent);
router.get('/hide-users', fetchHideUsers);
router.get('/hide-posts', fetchHidePosts);

// Password management routes
router.post('/reset-password', resetPassword);

// Reporting routes
router.post('/report-post', reportPost);

// chatting related
router.get('/chats/:userId',fetchChats);
router.get('/friends',fetchChatList);

router.post('/chats/:receiver/messages',upload.single('file'), sendMessage);
router.post('/chats/read', readMessage);

router.delete('/clearChat', clearChat);
router.delete('/deleteForMe',deleteForMe);
router.delete('/deleteForEveryone',deleteForEveryone);


export default router;
