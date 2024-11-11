import { response } from 'express';
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
  fetchPostHelper,
  likePostHelper,
  unLikePostHelper,
  userCreateComment,
  fetchPostsHelper,
  deletePostHelper,
  getFollowersHelper,
  getFollowingsHelper,
  deleteCommentHelper,
  getFreshStoriesHelper,
  incrementViewerCountHelper,
  fetchProfileStoresHelper,
  updatePostHelper,
  findSuggestionHelper,
  fetchUserNotificationsHelper,
  editProfileHelper,
  hidePostHelper,
  hideUserHelper,
  fetchHideUsersHelper,
  fetchHidePostsHelper,
  unHidePostHelper,
  unHideUserHelper,
  resetPasswordHelper,
  reportPostHelper,
  fetchUserHelper,
  fetchChatsHelper,
  sendMessageHelper,
  fetchChatListHelper,
  readMessageHelper,
  clearChatHelper,
  deleteForMeHelper,
  deleteForEveryoneHelper,
  getStoriesHelper,
  getCurrentUserStoriesHelper,
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
    const { userName, _id, profilePicture, email, bio, following, followers } = data;
    return res.status(200).json({
      message: 'User created successfully',
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
    });
  } catch (error) {
    console.error('Error in user sign-up:', error);
    return res
      .status(400)
      .json({ error: error.message || 'Something went wrong' });
  }
};

const verifyUser = async (req, res) => {
  res.status(200).json('user authenticated');
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

    const { userName, _id, profilePicture, email, bio, following, followers } = data;
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
    if (error.message === 'Your account is blocked') {
      return res.status(403).json({ message: 'Your account is blocked. Please contact support.' });
    }

    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const loginWithGoogle = async (req, res) => {
  try {
    const result = await userGoogleLoginHelper(req.body.credential); 
    googleLoginUser(result)
      .then(async (response) => {
        const { accessToken, refreshToken } = await generateUserToken(response);

        res.cookie('accessToken', accessToken, {
          maxAge: 4 * 60 * 1000,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
        });
        res.cookie('refreshToken', refreshToken, {
          maxAge: 7 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
        });

        const { userName, _id, profilePicture, email, bio, following, followers } = response;

        res.status(200).json({
          error: false,
          message: 'User logged in successfully',
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
    res.status(500).json({ message: 'Failed to authenticate', error: error.message }); // Send a proper response on failure
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
  followingHelper(_id,id, req.io)
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
  unFollowingHelper(_id,id, req.io)
    .then((response) => {
      return res.status(200).json(response);
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error'});
    });
};


const profile = (req, res) => {
  if (!req.user || !req.params.id) {
    return res.status(400).json({ error: 'Missing required user information.' });
  }

  const { _id } = req.user;
  const { id } = req.params;
  profileHelper(id, _id)
    .then((response) => {
      res.status(200).json(response);
    })
    .catch((error) => {
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
      if (error) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.status(500).json({ error: 'Internal Server Error' });
    });
};

const userSearch = (req, res) => {
  try {
    const { value } = req.params;
    const { _id } = req.user;
    const { item, offset } = req.query;
    searchHelper(_id, value, item, offset)
      .then((response) => {
        // On successful search, format the response
        return res.status(200).json({
          message: 'Search successful',
          data: response,
          timestamp: Date.now(),
        });
      })
      .catch((error) => {
        console.error('Error in searchHelper:', error); // Log the error for debugging
        return res.status(500).json({
          message: 'Search failed',
          error: error.message, // Include the error message in the response
          timestamp: Date.now(),
        });
      });
  } catch (error) {
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
    createPostHelper(body, content, _id)
      .then((response) => {
        return res.status(200).json({ message: 'post success', response });
      })
      .catch((error) => {
        return res.status(500).json({ message: 'post failed', error });
      });
  } catch (error) { 
    console.error(error);
    return res.status(500).json({ message: 'internal server error', error }); 
  }
};
const createStory =  async(req, res) => {
  try {
    const {content} = req.params;
    const { _id } = req.user;
    const  body   = req.body;
    createStoryHelper(body, content, _id)
      .then((response) => {
        return res.status(200).json({ message: 'post success', response });
      })
      .catch((error) => {
        return res.status(500).json({ message: 'post failed', error });
      });
  } catch (error) { 
    console.error(error);
    return res.status(500).json({ message: 'internal server error', error }); 
  }
};
const uploadImageCloud = (req, res) => {
  try {
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
    
    const result = await deleteImageCloudinary(url);
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

const fetchPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await fetchPostHelper(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(200).json(post);
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

const unLikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { _id } = req.user;

    if (!id || !_id) {
      return res.status(400).json({ message: 'Invalid request parameters' });
    }
    await unLikePostHelper(id, _id);

    res.status(200).json({ message: 'Post un liked successfully' });
  } catch (error) {
    console.error('Error un liking post:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { _id } = req.user;

    if (!id || !_id) {
      return res.status(400).json({ message: 'Invalid request parameters' });
    }
    await likePostHelper(id, _id, req.io);

    res.status(200).json({ message: 'Post un liked successfully' });
  } catch (error) {
    console.error('Error un liking post:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
const commentPost = async (req, res) => {
  try {
    const { id } = req.params; // Extract post ID from request parameters
    const { _id } = req.user; // Extract user ID from request user
    const { comment } = req.body; // Extract comment text from request body

    // Call the helper function to add the comment
    const result = await userCreateComment(id, _id, comment,);

    // Send a success response if the comment was added
    res.status(200).json({ message: 'Comment added successfully', result });
  } catch (error) {
    // Log the error and send a response with the error message
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const fetchPosts = async (req, res) => {
  try {
    const { heading, offset } = req.params;
    const { _id } = req.user;
    const response = await fetchPostsHelper(heading, offset, _id);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
const deletePost = (req,res) => {
  const {id} = req.params;
  const { _id } = req.user;
  deletePostHelper(id,_id) 
    .then((result) => {
      res.status(200).json({ message: 'Post deleted successfully' });
    })
    .catch((error) => {
      console.error('Error deleting post:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    });

};
const fetchConnections = async (req, res) => {
  const { id } = req.params;
  const { type, offset, query } = req.query; // Expecting type to be 'followers' or 'followings'
  try {
    let connections;
    if (type === 'followers') {
      connections = await getFollowersHelper(id, offset, query || '');
    } else if (type === 'followings') {
      connections = await getFollowingsHelper(id, offset, query || '');
    } else {
      return res.status(400).json({ message: 'Invalid type parameter. Use \'followers\' or \'followings\'.' });
    }

    return res.status(200).json(connections);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching connections.', error });
  }
};
const deleteComment = (req, res) => {
  try {
    const {commentId, postId} = req.query;
    const { _id } = req.user;
    
    deleteCommentHelper(commentId,postId,_id)
      .then((result) => {
        res.status(200).json({ message: 'Comment deleted successfully' , result});
      })
      .catch((error) => {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
      });
  }
  catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
const getFreshStories = async (req, res) => {
  try {
    const { _id } = req.user;

    const user = await getFreshStoriesHelper(_id);

    const userStories = await getCurrentUserStoriesHelper(_id);

    res.status(200).json({ userStories, user });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


const getStories = async (req, res) => {
  try {
    const { userName, storyId } = req.params;
    const { _id } = req.user;

    // Call the helper function to fetch stories
    const stories = await getStoriesHelper(userName, storyId,_id);
    // Respond with the fetched stories
    res.status(200).json(stories);
  } catch (error) {
    console.error('Error in getStories:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};




const incrementViewerCount = async (req, res) => {
  const {_id: userId}  = req.user;
  const { storyId, authorId }  = req.body;
  try {
    const response = await incrementViewerCountHelper(userId, storyId, authorId);
    if (response.error) {
      return res.status(400).send(response.error);
    }
    res.status(200).json({  response });
  } catch (error) {
    console.error('Failed to increment viewer count:', error);
    res.status(500).send('Server error');
  }

};
const fetchProfileStores = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await fetchProfileStoresHelper(userId);
    res.status(200).json(user);
  } catch (error) {
    console.error('Failed to fetch profile stories:', error);
    res.status(500).json({ error: 'An error occurred while fetching the profile stores.' });
  }
};


const editProfile = async (req, res) => {
  const { _id } = req.user; // Assuming req.user contains the authenticated user's ID
  const data = req.body; // Directly extracting the data from req.body
  try {
    const user = await editProfileHelper(_id, data);
    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const updatePost = (req,res) => {
  try {
    const { _id } = req.user;
    const  body   = req.body;
    updatePostHelper(body.postId, body.data, _id)
      .then((response) => {
        return res.status(200).json({ message: 'post success', });
      })
      .catch((error) => {
        return res.status(500).json({ message: 'post failed', error });
      });
  } catch (error) { 
    console.error(error);
    return res.status(500).json({ message: 'internal server error', error }); 
  }
};
const fetchSuggestions = async(req, res) => {
  const { _id} = req.user;
  const { offset } = req.params;
  findSuggestionHelper(_id,Number(offset))
    .then((response) => {
      return res.status(200).json(response);
    })
    .catch((error) => {
      console.error('Failed to fetch suggestions:', error);
      return res.status(500).json({ error: 'An error occurred while fetching the suggestions.'
      });
    });
};
const fetchUserNotifications = async(req, res) => {
  const { _id } = req.user;
  try {
    fetchUserNotificationsHelper(_id)
      .then((response) => {
        return res.status(200).json(response);
      })
      .catch((error) => {
        console.error('Failed to fetch user notifications:', error);
        return res.status(500).json({ error: 'An error occurred while fetching the user notifications'});
      });
  } catch (error) {
    console.error('Failed to fetch user notifications:', error);
    return res.status(500).json({ error: 'An error occurred while fetching the user notifications'});
  }

};
const hideContent = async (req, res) => {
  const {_id} = req.user; // Assume this is the current user's ID
  const { type, id } = req.body; // Get the type (post/user) and the specific ID from the request body

  try {
    let result;
    if (type === 'post') {
      result = await hidePostHelper(id,_id);
    } else if (type === 'user') {
      result = await hideUserHelper(id, _id);
    } else {
      return res.status(400).json({ error: 'Invalid type provided' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in hideContent:', error);
    return res.status(500).json({ error: 'Failed to hide content' });
  }
};


const unHideContent = async (req, res) => {
  const {_id} = req.user; // Assume this is the current user's ID
  const { type, id } = req.body; // Get the type (post/user) and the specific ID from the request body
  try {
    let result;
    if (type === 'post') {
      result = await unHidePostHelper(id,_id);
    } else if (type === 'user') {
      result = await unHideUserHelper(id, _id);
    } else {
      return res.status(400).json({ error: 'Invalid type provided' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in hideContent:', error);
    return res.status(500).json({ error: 'Failed to hide content' });
  }
};
const fetchHideUsers = async (req, res) => {
  try {
    const { _id } = req.user; // Assume this is the current user's ID from the request object
    const hiddenUsers = await fetchHideUsersHelper(_id);
    return res.status(200).json(hiddenUsers); // Send the list of hidden users as the response
  } catch (error) {
    console.error('Failed to fetch hidden users:', error);
    return res.status(500).json({ error: 'An error occurred while fetching the hidden users' });
  }
};

const fetchHidePosts = async (req, res) => {
  try {
    const { _id } = req.user; // Assuming the user's ID is set in req.user
    const hiddenPosts = await fetchHidePostsHelper(_id);
    return res.status(200).json(hiddenPosts); // Send the populated hidden posts as the response
  } catch (error) {
    console.error('Failed to fetch hidden posts:', error);
    return res.status(500).json({ error: 'An error occurred while fetching the hidden posts' });
  }
};
const resetPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validate and process the data
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Both current and new passwords are required.' });
  }

  try {
    // Await the resetPasswordHelper function to ensure proper execution
    const response = await resetPasswordHelper(req.user._id, currentPassword, newPassword);
    return res.status(200).json({ message: 'Password updated successfully', user: response });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
};
const reportPost = async (req,res) => {
  const data = req.body;
  reportPostHelper(data, req.user._id)
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((error) => {
      console.error('Error reporting post:', error);
      res.status(500).json({ error: error.message || 'Failed to report post' });
    });
};
const fetchChats = async (req, res) => {
  try {
    const { _id } = req.user;
    const { userId } = req.params;

    // Fetch the user using the helper function
    const user = await fetchUserHelper(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Assuming fetchChatsHelper is defined somewhere and returns chats for a given user
    const chats = await fetchChatsHelper(userId, _id, req.io);
    
    // Return the chats in the response
    return res.status(200).json({chats, user});
  } catch (error) {
    console.error('Error fetching chats:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const sendMessage = async (req, res) => {
  const { receiver } = req.params;
  const { message } = req.body;
  const {file} = req

   
  const { _id: senderId } = req.user;

  try {
    // Ensure receiver and message are provided
    if (!receiver ) {
      return res.status(400).json({ error: 'Receiver  are required' });
    }

    // Call helper function to send the message
    const response = await sendMessageHelper(senderId,file, receiver, message , req.io);

    // Respond with success message
    return res.status(201).json({ message: 'Message sent successfully', response });
  } catch (err) {
    console.error('Error sending message:', err);
    return res.status(500).json({ error: err.message || 'Failed to send message' });
  }
};

const fetchChatList = async (req, res) => {
  const { _id } = req.user;
  
  try {
    const chatList = await fetchChatListHelper(_id);
    res.status(200).json(chatList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching chat list' });
  }
};

const readMessage = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { messageId } = req.body; // Extracting messageId from the request body
    console.log(req.body);
    
    // Call the helper function to update the message status
    const updatedMessage = await readMessageHelper(messageId, userId, req.io);
    
    if (!updatedMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.status(200).json({ message: 'Message marked as read', updatedMessage });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const clearChat = (req, res) => {
  const { _id: userId } = req.user;
  const friendId = req.query.friendId;
  
  
  // Call the helper function to clear the chat
  clearChatHelper(userId, friendId)
    .then(() => {
      res.status(200).json({ message: 'Chat cleared successfully' });
    })
    .catch((error) => {
      console.error('Error clearing chat:', error);
      res.status(500).json({ message: 'Internal server error' });
    });
};


const deleteForMe = (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { messageId } = req.query;
    deleteForMeHelper(userId, messageId)
      .then(() => {
        res.status(200).json({ message: 'delete message successfully' });
      })
      .catch((error) => {
        console.error('Error delete message :', error);
        res.status(500).json({ message: 'Internal server error' });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteForEveryone = (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { messageId } = req.query;
    deleteForEveryoneHelper(userId, messageId)
      .then(() => {
        res.status(200).json({ message: 'deleteForEveryone message successfully' });
      })
      .catch((error) => {
        console.error('Error deleteForEveryone message :', error);
        res.status(500).json({ message: 'Internal server error' });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
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
  fetchPost,
  unLikePost,
  likePost,
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
  getStories,
};
