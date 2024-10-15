import { TOTP } from 'totp-generator';
import { Otp, User } from '../model/User.js';
import { OAuth2Client } from 'google-auth-library';

import sendOtpUserOtp from '../services/nodeMailer.js';

import cloudinary from 'cloudinary';
import { ObjectId } from 'mongodb';
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
import argon2 from 'argon2';
import Posts from '../model/Posts.js';
import users from '../services/usersNotfic.js';
import Notification from '../model/Notification.js';
import { Chat } from '../model/Chat.js';
import { isNewSenderForReceiver } from '../services/chatting.js';
import { uploadImageCloudinary } from '../services/uploadImageCloudinary.js';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const userValidateEmailHelper = async (user) => {
  try {
    const existingUser = await User.findOne({
      $or: [{ email: user.email }, { userName: user.userName }],
    });
    if (existingUser) {
      if (existingUser.email === user.email) {
        throw new Error('Email already exists');
      }
      throw new Error('Username already exists');
    }

    const otpSecret = 'JBSWY3DPEHPK3PXP';
    const { otp, expires } = TOTP.generate(otpSecret);

    let existingOtp = await Otp.findOne({ email: user.email });
    if (existingOtp) {
      existingOtp.otp = otp;
      existingOtp.expires = expires;
      await existingOtp.save();
    } else {
      existingOtp = new Otp({ otp, expires, email: user.email });
      await existingOtp.save();
    }

    await sendOtpUserOtp(user.email, otp); // Ensure otp is sent properly

    return { message: 'OTP sent successfully', user: user };
  } catch (error) {
    console.error('Error in user validation:', error);
    throw error;
  }
};

const userSignUpHelper = async (user) => {
  try {
    // Check if email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email: user.email }, { userName: user.userName }],
    });
    if (existingUser) {
      if (existingUser.email === user.email) {
        throw new Error('Email already exists');
      }
      throw new Error('Username already exists');
    }

    const otpInput = user.otp;
    const otpRecord = await Otp.findOne({ email: user.email });

    if (!otpRecord) {
      throw new Error('OTP not found');
    }
    if (otpRecord.otp !== otpInput) {
      throw new Error('Invalid OTP');
    }
    const hashPassword = await argon2.hash(user.password);
    // Save new user
    const newUser = new User({
      ...user,
      password: hashPassword,
    });
    const savedUser = await newUser.save();
    await Otp.deleteOne({ email: user.email });
    return savedUser;
  } catch (error) {
    console.error('Error saving user:', error);
    throw error; // Propagate the error up to the caller
  }
};

const userLoginHelper = async (user) => {
  return new Promise((resolve, reject) => {
    User.findOne({ email: user.email })
      .then(async (existingUser) => {
        if (!existingUser) {
          reject(new Error('Invalid credentials'));
        }
        if (existingUser.isBlocked.status) {
          reject(new Error('Your account is blocked'));
        }
        const isPasswordValid = await argon2.verify(
          existingUser.password,
          user.password
        );
        if (isPasswordValid) {
          await User.findByIdAndUpdate(existingUser._id, {
            lastActive: Date.now(),
          });

          resolve(existingUser);
        } else {
          reject(new Error('Invalid credentials'));
        }
      })
      .catch((err) => {
        console.error('Database query failed', err); // Log the actual error for debugging
        reject(new Error(`Database query failed: ${err.message}`)); // Pass the actual error message
      });
  });
};

const userGoogleLoginHelper = async (credential) => {
  // Directly use the credential as the ID token since it's the entire JWT string
  const idToken = credential; // No need to decode or extract further

  // Validate the ID token is present
  if (!idToken) {
    throw new Error('ID token is missing');
  }

  try {
    const response = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    return response.payload;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw error; // Rethrow the error to be caught by the calling function
  }
};

const googleLoginUser = async (user) => {
  return new Promise((resolve, reject) => {
    const { email } = user;
    User.findOne({ email })
      .then(async (existingUser) => {
        if (existingUser) {
          if (existingUser.isBlocked) {
            reject(
              new Error('Your account is blocked. Please contact support.')
            );
          } else {
            await User.findByIdAndUpdate(existingUser._id, {
              lastActive: Date.now(),
            });
            resolve(existingUser);
          }
        } else {
          reject(new Error('User not found'));
        }
      })
      .catch((error) => {
        reject(new Error(`Database query failed: ${error.message}`));
      });
  });
};

const logoutHelper = async (refreshToken) => {
  try {
    const user = await User.findOne({ token: refreshToken });
    if (user) {
      user.token = null;
      await user.save();
      return user;
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

const findSuggestion = async (id) => {
  try {
    const user = await User.findById(id)
      .populate('following')
      .populate('followers');
    if (!user) {
      // Handle the case where user is not found
      return { users: [], user: null };
    }

    // Ensure `following` is an array if it's null or undefined
    const following = user.following || [];
    const followingIds = following.map((follow) => follow._id);

    // Find users followed by the users in the `following` list, excluding current user and already followed users
    let users = await User.aggregate([
      {
        $match: {
          _id: { $ne: id },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'following',
          foreignField: '_id',
          as: 'suggestedUsers',
        },
      },
      {
        $unwind: '$suggestedUsers',
      },
      {
        $match: {
          'suggestedUsers._id': { $ne: id },
          'suggestedUsers._id': { $nin: followingIds },
        },
      },
      {
        $group: {
          _id: null,
          suggestedUsers: { $addToSet: '$suggestedUsers' },
        },
      },
      {
        $project: {
          _id: 0,
          suggestedUsers: 1,
        },
      },
      // {
      //   $skip: offset
      // },
      {
        $limit: 10,
      },
    ]);

    users = users.length > 0 ? users[0].suggestedUsers : [];

    // If fewer than 10 users are suggested, fill up with random users
    if (users.length < 10) {
      const additionalUsers = await User.aggregate([
        {
          $match: {
            _id: { $ne: id },
            _id: { $nin: followingIds.concat(users.map((u) => u._id)) },
          },
        },
        {
          $sample: { size: 10 - users.length },
        },
      ]);
      users = users.concat(additionalUsers);
    }

    return { users, user };
  } catch (error) {
    console.error('Error finding user suggestions:', error);
    throw error;
  }
};

const followingHelper = async (_id, userId, io) => {
  try {
    const follower = await User.findById(_id);
    const following = await User.findById(userId);

    if (!follower || !following) {
      throw new Error('User not found');
    }

    // Add _id to the following's followers array
    following.followers.push(_id);
    // Add userId to the follower's following array
    follower.following.push(userId);

    // Save the updated user documents
    await follower.save();
    await following.save();

    // Prepare notification details
    const details = {
      userName: follower.userName,
      profilePicture: follower.profilePicture,
    };

    // Check if the user is online
    const socketId = users.get(userId);
    const delivered = socketId ? true : false;
    await Notification.deleteOne({
      userId: userId,
      senderId: _id,
      type: 'follow',
    });

    // Create and save the notification
    const notification = new Notification({
      userId: userId,
      senderId: _id,
      type: 'follow',
      message: `${follower.userName} started following you`,
      isRead: false,
      delivered: delivered,
    });

    await notification.save();

    // Send real-time notification if user is online
    if (delivered) {
      io.to(socketId).emit('newNotification', {
        notification,
        senderDetails: details,
      });
    } else {
      console.error(`User ${userId} not connected`);
    }

    return following;
  } catch (error) {
    console.error('Error in followingHelper:', error);
    throw error;
  }
};

const unFollowingHelper = async (_id, userId) => {
  try {
    const follower = await User.findById(_id);
    const following = await User.findById(userId);

    if (!follower || !following) {
      throw new Error('User not found');
    }
    following.followers = following.followers.filter(
      (followerId) => followerId.toString() !== _id.toString()
    );
    follower.following = follower.following.filter(
      (followingId) => followingId.toString() !== userId.toString()
    );

    await follower.save();
    await following.save();
    return { message: 'Un follow successful' };
  } catch (error) {
    console.error('Error in unFollowingHelper:', error);
    throw error; // Rethrow to allow caller to handle or log the error further
  }
};

const profileHelper = (id, _id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const profile = await User.findById(id)
        .populate('followers')
        .populate('following');
      const user = await User.findById(_id)
        .populate('followers')
        .populate('following');
      const post = await Posts.find({ author: id })
        .populate('author')
        .populate({
          path: 'comments.author',
          select: 'userName profilePicture',
        });
      if (!user) throw new Error('User not found');
      if (!profile) throw new Error('Profile not found');

      resolve({ user, profile, post });
    } catch (error) {
      reject(error);
    }
  });
};

const userProfileHelper = async (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const profile = await User.findById(id)
        .populate('followers')
        .populate('following');
      const user = await User.findById(id)
        .populate('followers')
        .populate('following');
      const post = await Posts.find({ author: id })
        .populate('author')
        .populate({
          path: 'comments.author',
          select: 'userName profilePicture',
        });
      if (!profile) throw new Error('User not found');

      resolve({ profile, post, user });
    } catch (error) {
      console.error(error);
      reject(error);
    }
  });
};
const searchHelper = async (id, value, item, offset) => {
  offset = parseInt(offset, 10);

  return new Promise(async (resolve, reject) => {
    let queryResult;

    try {
      switch (item) {
        case 'users':
          const usersPipeline = [
            {
              $match: {
                $or: [
                  { userName: { $regex: value, $options: 'i' } },
                  { email: { $regex: value, $options: 'i' } },
                ],
              },
            },
          ];

          if (offset > 0) {
            usersPipeline.push({ $skip: offset });
          }

          usersPipeline.push({ $limit: 10 });

          queryResult = await User.aggregate(usersPipeline);
          break;

        case 'blogs':
          queryResult = await Posts.find({
            $or: [
              { title: { $regex: value, $options: 'i' } },
              { hashTags: { $regex: value, $options: 'i' } },
            ],
          })
            .skip(offset)
            .limit(10)
            .populate('author');
          break;

        case 'images':
          queryResult = await Posts.find({
            hashTags: { $elemMatch: { $regex: value, $options: 'i' } },
          })
            .skip(offset)
            .limit(10)
            .populate('author')
            .populate({
              path: 'comments.author',
              select: 'userName profilePicture',
            });
          break;

        default:
          throw new Error(`Unsupported item: ${item}`);
      }

      resolve(queryResult);
    } catch (error) {
      reject(error);
    }
  });
};

const uploadProfileHelper = async (id, file) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'Social Media',
      });
      const profile = await User.findByIdAndUpdate(
        id,
        {
          profilePicture: result.secure_url,
        },
        { new: true }
      ); // Assuming you want the updated document
      resolve(profile);
    } catch (error) {
      reject(error);
    }
  });
};

const createPostHelper = async (data, content, id) => {
  try {
    const hashTags = data.hashTag.match(/#[\w]+/g) || [];

    // Create a new post object
    const post = new Posts({
      author: id,
      content,
      hashTags, // Assign the extracted hashtags to the hashTags field
      ...data,
    });

    // Save the post to the database
    const savedPost = await post.save();
    return savedPost;
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
  }
};

const createStoryHelper = async (data, content, id) => {
  try {
    const post = {
      imageUrl: data.imageUrl,
    };

    // Find the user by ID
    const user = await User.findById(id);

    if (!user) {
      throw new Error('User not found');
    }

    // Push the new story post to the story array
    user.story.push(post);

    // Save the user document
    const savedUser = await user.save();
    return savedUser;
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
  }
};
const fetchPostHelper = async (id) => {
  try {
    // Ensure this line is correctly implemented based on your database setup
    const post = await Posts.findById(id).populate('author').populate({
      path: 'comments.author',
      select: 'userName profilePicture',
    });
    if (post) {
      post.comments.sort((a, b) => b.timestamps - a.timestamps);
    }
    return post;
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    throw error; // Rethrow the error to be caught by the calling function
  }
};
const unLikePostHelper = (id, _id) => {
  return new Promise((resolve, reject) => {
    Posts.updateOne({ _id: id }, { $pull: { likes: _id } })
      .then((result) => {
        if (result.matchedCount === 0) {
          // No matching document found
          return reject(new Error('No matching post found to unlike'));
        }
        resolve(result);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const likePostHelper = async (id, _id, io) => {
  try {
    // Check if the user has already liked the post
    const post = await Posts.findOne({ _id: id, likes: _id });
    const user = await User.findById(_id);

    if (post) {
      // If the post is found with the user's ID in likes, reject the promise
      return Promise.reject(new Error('User has already liked this post'));
    }

    // If the user has not liked the post, proceed to add the like
    const result = await Posts.findOneAndUpdate(
      { _id: id },
      { $push: { likes: _id } },
      { new: true }
    );

    if (!result) {
      // No matching document found
      return Promise.reject(new Error('No matching post found to like'));
    }

    const socketId = users.get(result.author._id.toString());
    const delivered = !!socketId;
    const details = {
      userName: user.userName,
      profilePicture: user.profilePicture,
    };

    // Delete existing like notification, if any
    await Notification.findOneAndDelete({
      userId: result.author._id.toString(),
      senderId: _id,
      postId: result._id,
      type: 'like',
    });

    // Create a new notification
    const notification = new Notification({
      userId: result.author._id.toString(),
      senderId: _id,
      postId: result._id,
      type: 'like',
      message: 'liked your post',
      isRead: false,
      delivered: delivered,
    });
    await notification.save();

    // Send real-time notification if the author is online
    if (socketId && !result.author._id.equals(_id)) {
      io.to(socketId).emit('newNotification', {
        notification,
        senderDetails: details,
      });
    }

    return result;
  } catch (error) {
    return Promise.reject(error);
  }
};

const userCreateComment = async (postId, userId, commentContent) => {
  try {
    // Update the post by pushing a new comment object into the comments array
    const result = await Posts.findOneAndUpdate(
      { _id: postId },
      { $push: { comments: { author: userId, content: commentContent } } },
      { new: true }
    )
      .populate('author')
      .populate({
        path: 'comments.author',
        select: 'userName profilePicture',
      });

    // Check if a document matched the query
    if (result.matchedCount === 0) {
      throw new Error('No matching post found to add the comment');
    }
    return result;
  } catch (error) {
    // Handle errors and reject the promise with the error message
    throw new Error(error.message);
  }
};

const fetchPostsHelper = async (heading, offset, id) => {
  offset = parseInt(offset);
  let postItems = [];

  try {
    // Fetch the user to get hidden posts and users
    const user = await User.findById(id);
    if (!user && heading === 'Friends') {
      throw new Error('User not found');
    }

    switch (heading) {
      case 'Recent':
        postItems = await Posts.find({
          _id: { $nin: user.hiddenPosts || [] }, // Exclude hidden posts
          author: { $nin: user.hiddenUsers || [] }, // Exclude posts by hidden users
        })
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(5)
          .populate('author')
          .populate({
            path: 'comments.author',
            select: 'userName profilePicture',
          })
          .exec();
        break;

      case 'Friends':
        postItems = await Posts.find({
          author: { $in: user.following || [] },
        })
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(5)
          .populate('author')
          .populate({
            path: 'comments.author',
            select: 'userName profilePicture',
          })
          .exec();
        break;

      case 'Popular':
        postItems = await Posts.aggregate([
          {
            $match: {
              _id: { $nin: user.hiddenPosts || [] }, // Exclude hidden posts
              author: { $nin: user.hiddenUsers || [] }, // Exclude posts by hidden users
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'author',
              foreignField: '_id',
              as: 'author',
            },
          },
          { $unwind: '$author' },
          {
            $addFields: {
              totalLikes: { $size: { $ifNull: ['$likes', []] } },
              totalComments: { $size: { $ifNull: ['$comments', []] } },
            },
          },
          {
            $addFields: {
              engagementScore: {
                $add: [
                  { $multiply: ['$totalLikes', 1] },
                  { $multiply: ['$totalComments', 3] },
                ],
              },
            },
          },
          {
            $addFields: {
              commentsAuthorArray: {
                $cond: {
                  if: { $isArray: '$comments.author' },
                  then: '$comments.author',
                  else: [],
                },
              },
            },
          },
          {
            $lookup: {
              from: 'users',
              let: { commentAuthors: '$commentsAuthorArray' },
              pipeline: [
                { $match: { $expr: { $in: ['$_id', '$$commentAuthors'] } } },
                { $project: { userName: 1, profilePicture: 1 } },
              ],
              as: 'commentAuthors',
            },
          },
          {
            $addFields: {
              comments: {
                $map: {
                  input: '$comments',
                  as: 'comment',
                  in: {
                    content: '$$comment.content',
                    author: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$commentAuthors',
                            cond: { $eq: ['$$this._id', '$$comment.author'] },
                          },
                        },
                        0,
                      ],
                    },
                    createdAt: '$$comment.createdAt',
                  },
                },
              },
            },
          },
          {
            $group: {
              _id: '$_id',
              author: { $first: '$author' },
              content: { $first: '$content' },
              imageUrl: { $first: '$imageUrl' },
              title: { $first: '$title' },
              body: { $first: '$body' },
              location:{ $first: '$location' },
              hashTag: { $first: '$hashTag' },
              likes: { $first: '$likes' },
              comments: { $first: '$comments' },
              totalLikes: { $first: '$totalLikes' },
              totalComments: { $first: '$totalComments' },
              engagementScore: { $first: '$engagementScore' },
              createdAt: { $first: '$createdAt' },
            },
          },
          {
            $sort: {
              engagementScore: -1,
              createdAt: -1,
            },
          },
          { $skip: offset },
          { $limit: 5 },
        ]);
        break;

      default:
        throw new Error(`Unsupported heading: ${heading}`);
    }

    return postItems;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};

const deletePostHelper = async (id, _id) => {
  try {
    const post = await Posts.findById(id);
    if (!post) {
      throw { error: 'Post not found' };
    }

    if (post.author.toString() !== _id) {
      throw { error: 'You are not authorized to delete this post' };
    }

    // await deleteImageCloudinary(post.imageUrl);
    await Posts.findByIdAndDelete(id)
      .then((res) => {
        return { success: 'Post deleted successfully', res };
      })
      .catch((err) => {
        console.error('Error deleting post:', err);
        return { error: 'Error deleting post' };
      });
  } catch (error) {
    return { error: 'An error occurred while deleting the post', error };
  }
};

const getFollowersHelper = async (userId, offset = 0, query) => {
  try {
    const user = await User.findById(userId).populate({
      path: 'followers',
      match:
        query.trim() === '' ? {} : {
          userName: { $regex: query, $options: 'i' },
        },
      options: {
        skip: Number(offset),
        limit: 10,
        select: 'userName profilePicture',
      },
    });

    if (!user) {
      throw new Error('User not found');
    }
    const totalCount = await User.aggregate([
      { $match: { _id: new ObjectId(userId) } },
      { $unwind: '$followers' },
      {
        $lookup: {
          from: 'users',
          localField: 'followers',
          foreignField: '_id',
          as: 'followersDetails',
        },
      },
      { $unwind: '$followersDetails' },
      {
        $match:
          query.trim() === '' ? {} : {
            'followersDetails.userName': { $regex: query, $options: 'i' },
          },
      },
      { $count: 'totalCount' },
    ]).then((result) => (result.length > 0 ? result[0].totalCount : 0));

    return { connections: user.followers, totalCount };
  } catch (error) {
    throw new Error(error.message);
  }
};

const getFollowingsHelper = async (userId, offset = 0, query) => {
  try {
    const user = await User.findById(userId).populate({
      path: 'following',
      match:
        query.trim() === '' ? {} : {
          userName: { $regex: query, $options: 'i' },
        },
      options: {
        skip: Number(offset),
        limit: 10,
        select: 'userName profilePicture',
      },
    });

    if (!user) {
      throw new Error('User not found');
    }
    const totalCount = await User.aggregate([
      { $match: { _id: new ObjectId(userId) } },
      { $unwind: '$following' },
      {
        $lookup: {
          from: 'users',
          localField: 'following',
          foreignField: '_id',
          as: 'followingDetails',
        },
      },
      { $unwind: '$followingDetails' },
      {
        $match:
          query.trim() === '' ? {} : {
            'followingDetails.userName': { $regex: query, $options: 'i' },
          },
      },
      { $count: 'totalCount' },
    ]).then((result) => (result.length > 0 ? result[0].totalCount : 0));

    return { connections: user.following, totalCount };
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
  }
};

const deleteCommentHelper = (commentId, postId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const updatedPost = await Posts.findOneAndUpdate(
        { _id: postId },
        { $pull: { comments: { _id: commentId } } },
        { new: true }
      )
        .populate('author')
        .populate({
          path: 'comments.author',
          select: 'userName profilePicture',
        });

      if (!updatedPost) {
        return reject(new Error('Post not found'));
      }

      resolve(updatedPost);
    } catch (error) {
      reject(error);
    }
  });
};

const getFreshStoriesHelper = async (userId) => {
  try {
    const currentUser = await User.findById(userId).lean();

    const twentyFourHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 24);

    // Aggregation pipeline
    const users = await User.aggregate([
      { $unwind: '$story' },
      {
        $match: {
          'story.createdAt': { $gt: twentyFourHoursAgo },
          $or: [
            { followers: new ObjectId(currentUser._id) },
            { following: new ObjectId(currentUser._id) },
           
          ],
          _id: { $ne: new ObjectId(currentUser._id) }, // Exclude the current user

        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'story.views.userId',
          foreignField: '_id',
          as: 'story.views.userDetails',
        },
      },
      {
        $group: {
          _id: '$_id',
          userName: { $first: '$userName' },
          email: { $first: '$email' },
          profilePicture: { $first: '$profilePicture' },
          story: { $push: '$story' }, // Pushing stories for the user
        },
      },
      {
        $sort: { userName: 1 } 
      },
      {
        $project: {
          _id: 1,
          userName: 1,
          email: 1,
          profilePicture: 1,
          story: 1
        }
      }
    ]);


    return users;
  } catch (error) {
    console.error('Error fetching fresh stories:', error);
    throw error;
  }
};


const getStoriesHelper = async (userName, storyId,  _id) => {

  try {
    // Fetch user by userName
    const user = await User.findOne(
      { userName },
      { userName: 1, profilePicture: 1, story: 1, _id: 1 }
    ).lean();

    if (!user) {
      throw new Error('User not found');
    }

    const twentyFourHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 24);

    // Filter the stories created within the last 24 hours
    const recentStories = user.story.filter((story) => story.createdAt > twentyFourHoursAgo);

    const specificStory = recentStories.find((story) => story._id.toString() === storyId);
    const hasViewed = specificStory.views.some((view) => view.userId.toString() === _id);

    if (!hasViewed) {
      // If the user hasn't viewed the story, add their view details
      await User.updateOne(
        { _id: user._id, 'story._id': storyId }, // Find the specific user and story
        {
          $push: {
            'story.$.views': {
              userId: _id,
              viewedAt: new Date(),
            },
          },
        }
      );
    }
    if (!specificStory) {
      throw new Error('Story not found');
    }

    const allUsersWithFreshStories = await getFreshStoriesHelper(_id);

    // Find the current user index in the fresh stories list
    const currentUserIndex = allUsersWithFreshStories.findIndex(
      (u) => u.userName === userName
    );

    if (currentUserIndex === -1) {
      return {
        recentStories,
        user: { userName: user.userName, profilePicture: user.profilePicture,_id: user._id },
        nextUserId: null,
        nextUserName: null,
        nextStoryId: null,
        previousUserId: null,
        previousUserName: null,
        previousStoryId: null,
      };
    }

    let nextStoryId, nextUserId, nextUserName;
    let previousStoryId, previousUserId, previousUserName;

    const specificStoryIndex = recentStories.findIndex(
      (story) => story._id.toString() === storyId
    );

    // Logic for next story
    if (specificStoryIndex < recentStories.length - 1) {
      // Next story within the same user
      nextStoryId = recentStories[specificStoryIndex + 1]._id;
      nextUserId = user._id;
      nextUserName = user.userName;
    } else {
      // Move to the next user's first story, with array wrapping
      const nextUserIndex = (currentUserIndex + 1);
      const nextUser = allUsersWithFreshStories[nextUserIndex];

      if (nextUser && nextUser.story.length > 0) {
        nextStoryId = nextUser.story[0]._id;
        nextUserId = nextUser._id;
        nextUserName = nextUser.userName;
      } else {
        nextStoryId = null;
        nextUserId = null;
        nextUserName = null;
      }
    }

    // Logic for previous story
    if (specificStoryIndex > 0) {
      // Previous story within the same user
      previousStoryId = recentStories[specificStoryIndex - 1]._id;
      previousUserId = user._id;
      previousUserName = user.userName;
    } else {
      // Move to the previous user's last story, with array wrapping
      const previousUserIndex = (currentUserIndex - 1);
      const previousUser = allUsersWithFreshStories[previousUserIndex];

      if (previousUser && previousUser.story.length > 0) {
        previousStoryId = previousUser.story[previousUser.story.length - 1]._id;
        previousUserId = previousUser._id;
        previousUserName = previousUser.userName;
      } else {
        previousStoryId = null;
        previousUserId = null;
        previousUserName = null;
      }
    }

    return {
      specificStory,
      user: { userName: user.userName, profilePicture: user.profilePicture ,_id: user._id},
      nextUserId, // Next user ID
      nextUserName, // Next user name
      nextStoryId, // Next story ID
      previousUserId, // Previous user ID
      previousUserName, // Previous user name
      previousStoryId, // Previous story ID
    };
  } catch (error) {
    console.error('Error fetching stories:', error);
    throw error;
  }
};

const getCurrentUserStoriesHelper = async (_id) => {
  const twentyFourHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 24);

  // Find the current user and populate the views in each story
  const user = await User.findById(_id)
    .select('userName profilePicture story')
    .populate({
      path: 'story.views.userId',
      select: 'userName profilePicture', // Select only relevant fields from the user
    })
    .lean();

  if (!user) {
    throw new Error('User not found');
  }

  // Filter stories created in the last 24 hours
  const recentStories = user.story.filter((story) => new Date(story.createdAt) > twentyFourHoursAgo);

  return {
    user: {
      userName: user.userName,
      profilePicture: user.profilePicture,
    },
    stories: recentStories,
  };
};

 
const incrementViewerCountHelper = async (userId, storyId, authorId) => {
  try {
    // Find the author by ID and populate the story field
    const user = await User.findById(authorId).populate('story.views.userId');
    if (!user) {
      return { error: 'Author not found' };
    }

    // Find the specific story within the user's story array
    const story = user.story.id(storyId);
    if (!story) {
      return { error: 'Story not found' };
    }

    // Check if the user has already viewed the story
    if (!story.views.some((view) => view.userId.equals(userId))) {
      // Add the user to the list of viewers
      story.views.push({ userId, viewedAt: new Date() });
      await user.save(); // Save the updated user document
    }

    // Return the count of viewers for the story
    return { story };
  } catch (error) {
    console.error('Error in incrementViewerCountHelper:', error);
    return { error: 'Server error' };
  }
};

const fetchProfileStoresHelper = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.aggregate([
        { $match: { _id: new ObjectId(userId) } },
        { $unwind: '$story' },

        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$story.createdAt' },
            },
            story: { $push: '$story' },
          },
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            story: 1,
          },
        },

        // Sort by date if needed
        { $sort: { date: -1 } },
      ]);
      resolve(user);
    } catch (error) {
      reject(error);
    }
  });
};

const editProfileHelper = async (userId, data) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: data },
      { new: true, runValidators: true } // Return the updated document and run validation
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    throw new Error(error.message);
  }
};

const updatePostHelper = async (postId, data, _id) => {
  try {
    // Log the incoming data for debugging

    const hashTags = data.hashTag?.match(/#[\w]+/g) || [];

    // Find the existing post by ID
    const existingPost = await Posts.findById(postId);
    if (!existingPost) {
      throw new Error('Post not found');
    }

    // Check if the current user is the author of the post
    if (existingPost.author.toString() !== _id) {
      return { error: 'You are not the author of this post' };
    }

    // Update the post fields
    existingPost.content =
      data.content !== undefined ? data.content : existingPost.content;
    existingPost.hashTags =
      hashTags.length > 0 ? hashTags : existingPost.hashTags;
    existingPost.title =
      data.title !== undefined ? data.title : existingPost.title;
    existingPost.body = data.body !== undefined ? data.body : existingPost.body;
    existingPost.likes =
      data.likes !== undefined ? data.likes : existingPost.likes;
    existingPost.comments =
      data.comments !== undefined ? data.comments : existingPost.comments;
    existingPost.location =
      data.location !== undefined ? data.location : existingPost.location;

    // Save the updated post to the database
    const updatedPost = await existingPost.save();

    return updatedPost;
  } catch (error) {
    console.error('Error updating post:', error.message);
    throw new Error(error.message);
  }
};

const findSuggestionHelper = async (currentUserId, offset = 0) => {
  try {
    const suggestions = await User.aggregate([
      {
        $match: { _id: new ObjectId(currentUserId) },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'following',
          foreignField: '_id',
          as: 'followingUsers',
        },
      },
      {
        $unwind: '$followingUsers',
      },
      {
        $lookup: {
          from: 'users',
          localField: 'followingUsers.following',
          foreignField: '_id',
          as: 'suggestedUsers',
        },
      },
      {
        $unwind: '$suggestedUsers',
      },
      {
        $project: {
          suggestedUser: '$suggestedUsers',
          isFollowing: {
            $in: ['$suggestedUsers._id', '$following'],
          },
        },
      },
      {
        $match: {
          'suggestedUser._id': { $ne: new ObjectId(currentUserId) },
          isFollowing: false,
        },
      },
      {
        $group: {
          _id: '$suggestedUser._id',
          userName: { $first: '$suggestedUser.userName' },
          profilePicture: { $first: '$suggestedUser.profilePicture' },
          commonFollowCount: { $sum: 1 },
        },
      },
      {
        $sort: { commonFollowCount: -1 },
      },
      {
        $skip: offset, // Pagination offset
      },
      {
        $limit: 6, // Number of suggestions per page
      },
    ]);

    return suggestions;
  } catch (error) {
    throw new Error(`Failed to find user suggestions: ${error.message}`);
  }
};

const fetchUserNotificationsHelper = async (userId) => {
  try {
    const notifications = await Notification.aggregate([
      {
        $match: {
          $and: [{ userId: new ObjectId(userId) }, { delivered: true }],
        },
      },
      {
        $sort: {
          createdAt: -1, // Sort by creation date, most recent first
        },
      },
      {
        $lookup: {
          from: 'users', // The collection name for users
          localField: 'senderId', // The field in Notification that references the sender
          foreignField: '_id', // The field in User that matches the senderId
          as: 'senderDetails', // The name of the array where the sender data will be stored
        },
      },
      {
        $unwind: '$senderDetails', // Deconstruct the senderDetails array to merge with the root document
      },
      {
        $lookup: {
          from: 'posts',
          localField: 'postId',
          foreignField: '_id',
          as: 'postDetails',
        },
      },
      {
        $unwind: '$postDetails',
      },
      {
        $project: {
          notification: {
            userId: '$userId',
            senderId: '$senderId',
            type: '$type',
            message: '$message',
            isRead: '$isRead',
            postId: '$postId',
            _id: '$_id',
            createdAt: '$createdAt',
          },
          senderDetails: {
            userName: '$senderDetails.userName',
            profilePicture: '$senderDetails.profilePicture',
            postImage: '$postDetails.imageUrl',
          },
        },
      },
    ]);

    return notifications;
  } catch (error) {
    console.error('Error in fetchUserNotificationsHelper:', error);
    throw error;
  }
};

const hidePostHelper = async (postId, userId) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { hiddenPosts: postId } },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    console.log(`Hiding post with ID: ${postId} for user with ID: ${userId}`);
    return { message: 'Post hidden successfully' };
  } catch (error) {
    console.error('Error hiding post:', error);
    throw new Error('Failed to hide post');
  }
};

const hideUserHelper = async (userId, currentUserId) => {
  // Hide a user from the current user's notifications by adding userId to the hiddenUsers array
  try {
    // Find the user by currentUserId and add userId to the hiddenUsers array
    const user = await User.findByIdAndUpdate(
      currentUserId,
      { $addToSet: { hiddenUsers: userId } }, // $addToSet ensures no duplicates
      { new: true } // Return the updated document
    );

    if (!user) {
      throw new Error('User not found');
    }

    return { message: 'User hidden successfully' };
  } catch (error) {
    console.error('Error hiding user:', error);
    throw new Error('Failed to hide user');
  }
};

const fetchHideUsersHelper = async (userId) => {
  try {
    const user = await User.findById(userId)
      .populate('hiddenUsers', 'userName email profilePicture')
      .exec();

    if (!user) {
      throw new Error('User not found');
    }

    return user.hiddenUsers;
  } catch (error) {
    console.error('Error fetching hidden users:', error);
    throw error; // Re-throw the error to be caught by fetchHideUsers
  }
};

const fetchHidePostsHelper = async (userId) => {
  try {
    // Fetch the user and populate hidden posts
    const user = await User.findById(userId)
      .populate({
        path: 'hiddenPosts',
        select: 'title content imageUrl author', // Ensure this matches your Post schema
        populate: {
          path: 'author', // Populate the author field if it's a reference
          select: 'userName', // Select only the fields you need
        },
      })
      .exec();

    if (!user) {
      throw new Error('User not found');
    }

    return user.hiddenPosts; // Return the populated hidden posts
  } catch (error) {
    console.error('Error fetching hidden posts:', error);
    throw error; // Re-throw the error to be caught by fetchHidePosts
  }
};

const unHidePostHelper = async (postId, userId) => {
  try {
    // Find the user and remove the post ID from hiddenPosts array
    const result = await User.findByIdAndUpdate(
      userId,
      { $pull: { hiddenPosts: postId } },
      { new: true, projection: { hiddenPosts: 1 } } // Return the updated hiddenPosts array
    );

    if (!result) {
      throw new Error('User not found');
    }

    return result.hiddenPosts;
  } catch (error) {
    console.error('Error in unHidePostHelper:', error);
    throw error;
  }
};

const unHideUserHelper = async (userIdToUnhide, currentUserId) => {
  try {
    // Find the current user and remove the user ID from hiddenUsers array
    const result = await User.findByIdAndUpdate(
      currentUserId,
      { $pull: { hiddenUsers: userIdToUnhide } },
      { new: true, projection: { hiddenUsers: 1 } } // Return the updated hiddenUsers array
    );

    if (!result) {
      throw new Error('User not found');
    }

    return result.hiddenUsers;
  } catch (error) {
    console.error('Error in unHideUserHelper:', error);
    throw error;
  }
};

const resetPasswordHelper = async (userId, currentPassword, newPassword) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await argon2.verify(user.password, currentPassword);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    user.password = await argon2.hash(newPassword);
    await user.save();

    return user;
  } catch (error) {
    throw error;
  }
};

const reportPostHelper = (data, userId) => {
  return new Promise(async (resolve, reject) => {
    const post = await Posts.findById(data.postId);
    if (!post) {
      reject(new Error('Post not found'));
    }

    post.reports.push({
      reporter: userId,
      reason: data.reason,
    });
    await post.save();
    resolve('success');
  });
};

const fetchUserHelper = async (userId) => {
  try {
    return await User.findById(userId);
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error; 
  }
};

const fetchChatsHelper = async (userId1, userId2, io) => {
  try {
    const unreadMessages = await Chat.find({
      sender: userId1, 
      receiver: userId2,
      status: { $ne: 'read' }
    });

    if (unreadMessages.length === 0) {
      console.log('No unread messages to update');
    } else {
      const updateResult = await Chat.updateMany(
        {
          sender: userId1,
          receiver: userId2,
          status: { $ne: 'read' }
        },
        { $set: { status: 'read' } }
      );

      console.log(`Marked ${updateResult.modifiedCount} messages as 'read'`);

      const socketId = users.get(userId1);
      if (socketId) {
        unreadMessages.forEach((message) => {
          message.status = 'read';
          io.timeout(5000).to(socketId).emit('readMessage', message); // Emit the message update to the socket
        });
        console.log(`Emitted 'readMessage' event for ${unreadMessages.length} messages`);
      } else {
        console.warn(`No socket connection for user ${userId1}`);
      }
    }

    const chats = await Chat.find({
      $or: [
        { sender: userId1, receiver: userId2, isDeletedByReceiver: { $ne: true } },
        { sender: userId2, receiver: userId1, isDeletedBySender: { $ne: true } }
      ]
    }).sort({ timestamp: 1 });
    

    return chats;
  } catch (error) {
    console.error('Error fetching chats:', error);
    throw new Error('Failed to fetch chats');
  }
};

const readMessageHelper = async (messageId, userId, io) => {
  try {
    // Ensure messageId and userId are valid
    if (!messageId || !userId) {
      throw new Error('Invalid messageId or userId');
    }

    // Update the message status to 'read'
    const updatedMessage = await Chat.findByIdAndUpdate(
      messageId,
      { status: 'read' },
      { new: true } // Return the updated document
    );

    // If no message is found, throw an error
    if (!updatedMessage) {
      throw new Error(`Message with ID ${messageId} not found`);
    }

    // Log the entire updated message for debugging
    console.log('Updated message:', updatedMessage);

    // Ensure the sender field exists
    if (!updatedMessage.sender) {
      throw new Error('Sender field is missing in the message');
    }

    // Notify the user via socket
    const socketId = users.get(updatedMessage.sender.toString()); // Retrieve the user's socket ID
    console.log('Sender ID:', updatedMessage.sender, socketId);

    if (socketId) {
      io.timeout(5000)
        .to(socketId)
        .emit('readMessage', updatedMessage); // Emit 'readMessage' to the user's socket
    } else {
      console.warn(`No socket connection for sender ${updatedMessage.sender}`);
    }

    return updatedMessage;
  } catch (error) {
    console.error('Error updating message status:', error.message);
    throw new Error('Failed to update message status');
  }
};


const sendMessageHelper = async (senderId, file, receiverId, messageContent, io) => {
  try {
    // Check if messageContent or file is provided
    if (!messageContent && !file) {
      throw new Error('Message content or file must be provided');
    }

    const existingChat = await Chat.findOne({
      sender: senderId,
      receiver: receiverId,
    });
    
    let mediaUrl = null;
    let messageType = 'text';

    // If file is provided, upload it and set mediaUrl and messageType
    if (file) {
      const uploadResult = await uploadImageCloudinary(file);
      mediaUrl = uploadResult.secure_url;
      messageType = 'image'; 
    }

    // Create the new chat message object
    const newChat = new Chat({
      sender: senderId,
      receiver: receiverId,
      content: messageContent || '', // Set empty string if messageContent is null/undefined
      mediaUrl,
      messageType,
      status: 'sent',
    });
    
    const savedChat = await newChat.save();

    const socketId = users.get(receiverId);
    if (socketId) {
      try {
        io.timeout(5000)
          .to(socketId)
          .emit(
            'receiveMessage',
            {
              sender: senderId,
              receiver: receiverId,
              content: messageContent || '', // Include content in the message
              timestamp: Date.now(),
              isRead: false,
              _id: savedChat._id,
            },
            (error, callback) => {
              if (error) {
                console.error('Error sending message:', error);
              } else {
                console.log(callback);
                
                // Update status to 'delivered' if the callback succeeds
                savedChat.status = callback.status || 'delivered';
                savedChat.save();

                // Notify the sender that the message was delivered
                const senderSocketId = users.get(senderId); 
                if (senderSocketId) {
                  io.to(senderSocketId).emit('messageDelivered', {
                    senderId: senderId,
                    receiverId: receiverId,
                    messageId: savedChat._id,
                    _id: savedChat._id,
                    status: 'delivered',
                  });
                }
              }
            }
          );

        // Notify the receiver of a new sender if no previous chat exists
        if (!existingChat) {
          const sender = await User.findById(senderId).select('userName _id profilePicture');
          io.timeout(5000).to(socketId).emit('newSender', sender);
        }
      } catch (error) {
        console.error('Error emitting message:', error);
      }
    } else {
      console.log('Socket ID not found for receiver:', receiverId);
    }

    console.error(users, socketId);
    
    // Return the saved chat message
    return savedChat;
  } catch (error) {
    console.error('Error in sendMessageHelper:', error);
    throw new Error('Failed to send message');
  }
};


const fetchChatListHelper = async (id) => {
  try {
    const friends = await Chat.aggregate([
      {
        $match: {
          $or: [{ sender: new ObjectId(id) }, { receiver: new ObjectId(id) }],
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', new ObjectId(id)] },
              '$receiver',
              '$sender',
            ],
          },
          latestChat: { $first: '$$ROOT' }, // Get the latest chat document
          unreadMessagesCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', new ObjectId(id)] }, // Check if the current user is the receiver
                    { $eq: ['$isRead', false] }, // Check if the message is unread
                    { $or: [ // Check the status conditions if needed
                      { $eq: ['$status', 'sent'] },
                      { $eq: ['$status', 'delivered'] }
                    ] }
                  ],
                },
                1, // If all conditions are true, count this message
                0, // Otherwise, count nothing
              ],
            },
          },
          sentMessagesCount: {
            $sum: {
              $cond: [{ $eq: ['$latestChat.status', 'sent'] }, 1, 0],
            },
          },
          deliveredMessagesCount: {
            $sum: {
              $cond: [{ $eq: ['$latestChat.status', 'delivered'] }, 1, 0],
            },
          },
          readMessagesCount: {
            $sum: {
              $cond: [{ $eq: ['$latestChat.status', 'read'] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'friendInfo',
        },
      },
      {
        $unwind: '$friendInfo',
      },
      {
        $project: {
          _id: 0, // Exclude _id
          'friendInfo._id': 1, // Include user _id
          'friendInfo.userName': 1, // Include userName
          'friendInfo.profilePicture': 1, // Include profilePicture
          latestChat: 1, // Include latestChat details
          unreadMessagesCount: 1, // Include unread message count
          sentMessagesCount: 1, // Include sent message count
          deliveredMessagesCount: 1, // Include delivered message count
          readMessagesCount: 1, // Include read message count
        },
      },
      {
        $sort: { 'latestChat.timestamp': -1 }, // Sort by the latest chat timestamp
      },
    ]);

    const result = friends.map(({ friendInfo, latestChat, unreadMessagesCount, sentMessagesCount, deliveredMessagesCount, readMessagesCount }) => ({
      ...friendInfo,
      latestChat,
      unreadMessagesCount, // Attach unread messages count
      sentMessagesCount, // Attach sent messages count
      deliveredMessagesCount, // Attach delivered messages count
      readMessagesCount, // Attach read messages count
    }));

    console.log(result);
    
    return result;
  } catch (error) {
    console.error('Error fetching chat list:', error);
    throw error;
  }
};


const clearChatHelper = async (userId, friendId) => {
  try {
    const chatsSent = await Chat.updateMany(
      { sender: userId, receiver: friendId },
      { $set: { isDeletedBySender: true } }
    );

    // Update the chats where the current user is the receiver
    const chatsReceived = await Chat.updateMany(
      { sender: friendId, receiver: userId },
      { $set: { isDeletedByReceiver: true } }
    );

    
    return true;  // Return the result as a promise
  } catch (error) {
    console.error('Error fetching chats:', error);
    throw error;  // In case of error, reject the promise by throwing an error
  }
};

const deleteForMeHelper = async (userId, messageId) => {
  try {
    const message = await Chat.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    if (message.sender.toString() === userId) {
      message.isDeletedBySender = true;
    } else if (message.receiver.toString() === userId) {
      message.isDeletedByReceiver = true;
    } else {
      throw new Error('User is not authorized to delete this message');
    }
    
    await message.save();
    
    return { success: true, message: 'Message deleted successfully', updatedMessage: message };
  } catch (error) {
    console.error('Error deleting message:', error);
    throw new Error('Failed to delete message');
  }
};


const deleteForEveryoneHelper = async (userId, messageId) => {
  try {
    const message = await Chat.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender.toString() !== userId) {
      throw new Error('User is not authorized to delete this message');
    }

    await Chat.findByIdAndDelete(messageId);

    return { success: true, message: 'Message deleted for everyone successfully' };
  } catch (error) {
    console.error('Error deleting message for everyone:', error);
    throw new Error('Failed to delete message for everyone');
  }
};

export {
  userLoginHelper,
  logoutHelper,
  userSignUpHelper,
  userGoogleLoginHelper,
  googleLoginUser,
  userValidateEmailHelper,
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
  unLikePostHelper,
  likePostHelper,
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
  hideUserHelper,
  hidePostHelper,
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
};

