import { TOTP } from 'totp-generator';
import { Otp, User } from '../model/User.js';
import { OAuth2Client } from 'google-auth-library';
import sendOtpUserOtp from '../services/nodeMailer.js';
import cloudinary from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
import argon2 from 'argon2';
import Posts from '../model/Posts.js';
import { populate } from 'dotenv';
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
    return savedUser;
  } catch (error) {
    console.error('Error saving user:', error);
    throw error; // Propagate the error up to the caller
  }
};

const userLoginHelper = async (user) => {
  return new Promise((resolve, reject) => {
    User.findOne({ email: user.email })
      .then(async(existingUser) => {

        if (!existingUser) {
          throw new Error('Invalid credentials');
        }
        const isPasswordValid = await argon2.verify(existingUser.password, user.password);
        if (isPasswordValid) {
          resolve(existingUser);
        } else {
          reject(new Error('Invalid credentials'));
        }
      })
      .catch((err) => {
        reject(new Error('Database query failed', err));
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
      .then((user) => {
        if (user) {
          resolve(user);
        } else {
          reject(new Error('User not found'));
        }
      })
      .catch((error) => {
        reject(error);
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
    const user = await User.findById(id).populate('following').populate('followers');
  
    if (!user) {
      // Handle the case where user is not found
      return { users: [], user: null };
    }
  
    // Ensure `following` is an array if it's null or undefined
    const following = user.following || [];
    const followingIds = following.map(follow => follow._id);
  
    // Find users followed by the users in the `following` list, excluding current user and already followed users
    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: id }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'following',
          foreignField: '_id',
          as: 'suggestedUsers'
        }
      },
      {
        $unwind: '$suggestedUsers'
      },
      {
        $match: {
          'suggestedUsers._id': { $ne: id },
          'suggestedUsers._id': { $nin: followingIds }
        }
      },
      {
        $group: {
          _id: null,
          suggestedUsers: { $addToSet: '$suggestedUsers' }
        }
      },
      {
        $project: {
          _id: 0,
          suggestedUsers: 1
        }
      }
    ]);

    return { users: users.length > 0 ? users[0].suggestedUsers : [], user };
  } catch (error) {
    console.error('Error finding user suggestions:', error);
    throw error;
  }
};


const followingHelper = (_id, userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const follower = await User.findById(_id);
      const following = await User.findById(userId);

      if (!follower && !following) {
        throw new Error('User not found');
      }
      following.followers.push(_id);
      // Add userId to the following array
      follower.following.push(userId);
      
      // Save the updated user document
      await follower.save();
      await following.save();
      resolve(following);
    } catch (error) {
      reject(error);
    }
  });
};

const unFollowingHelper = async (_id, userId) => {
  try {
    const follower = await User.findById(_id);
    const following = await User.findById(userId);

    if (!follower || !following) {
      throw new Error('User not found');
    }
    following.followers = following.followers.filter(followerId => followerId.toString() !== _id.toString());
    follower.following = follower.following.filter(followingId => followingId.toString() !== userId.toString());


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
        const post = await Posts.find({author: id})
        .populate('author');
      if (!user) throw new Error('User not found');
      if (!profile) throw new Error('Profile not found');

      resolve({ user, profile, post  });
    } catch (error) {
      reject(error);
    }
  });
};

const userProfileHelper = async(id) => {
  return new Promise(async (resolve, reject) => {
    try {

      const profile = await User.findById(id)
        .populate('followers')
        .populate('following');
      const user = await User.findById(id)
        .populate('followers')
        .populate('following');
      const post = await Posts.find({author: id})
        .populate('author');
      if (!profile) throw new Error('User not found');

      resolve({ profile, post, user });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};
const searchHelper = async (id, value, item, offset) => {
  offset = parseInt(offset, 10);

  return new Promise(async (resolve, reject) => {
    let queryResult;

    switch (item) {
      case 'users':
        try {
          const usersPipeline = [
            {
              $match: {
                $or: [
                  { userName: { $regex: value, $options: 'i' }},
                  { email: { $regex: value, $options: 'i' } }
                ]
              }
            }
          ];

          if (offset > 0) {
            usersPipeline.push({ $skip: offset });
          }

          usersPipeline.push({ $limit: 10 });

          queryResult = await User.aggregate(usersPipeline);
        } catch (error) {
          return reject(error);
        }
        break;

      case 'blogs':
        try {
          queryResult = await Blog.find({ title: new RegExp(value, 'i') })
            .skip(offset)
            .limit(5);
        } catch (error) {
          return reject(error);
        }
        break;

      case 'images':
        try {
          queryResult = await Image.find({ description: new RegExp(value, 'i') })
            .skip(offset)
            .limit(2);
        } catch (error) {
          return reject(error);
        }
        break;

      default:
        return reject(new Error(`Unsupported item: ${item}`));
    }

    resolve(queryResult);
  });
};


const uploadProfileHelper = async (id, file) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'Social Media'
      });
      const profile = await User.findByIdAndUpdate(id, {
        profilePicture: result.secure_url
      }, { new: true }); // Assuming you want the updated document
      resolve(profile);
    } catch (error) {
      reject(error);
    }
  });
};
const  createPostHelper = async (data, content, id) => {
  try {
    const post = new Posts({
      author: id,
      content,
      ...data
    });

    const savedPost = await post.save();
    return savedPost;
  } catch (error) {
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
    const post = await Posts.findById(id).populate('author');
    return post;
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    throw error; // Rethrow the error to be caught by the calling function
  }
};
const unLikePostHelper = (id, _id) => {
  return new Promise((resolve, reject) => {
    Posts.updateOne(
      { _id: id },
      { $pull: { likes: _id } }
    )
      .then(result => {
        if (result.matchedCount === 0) {
          // No matching document found
          return reject(new Error('No matching post found to unlike'));
        }
        resolve(result);
      })
      .catch(error => {
        reject(error);
      });
  });
};


const likePostHelper = async (id, _id) => {
  try {
    // Check if the user has already liked the post
    const post = await Posts.findOne({ _id: id, likes: _id });

    if (post) {
      // If the post is found with the user's ID in likes, reject the promise
      return Promise.reject(new Error('User has already liked this post'));
    }

    // If the user has not liked the post, proceed to add the like
    const result = await Posts.updateOne(
      { _id: id },
      { $push: { likes: _id } }
    );

    if (result.matchedCount === 0) {
      // No matching document found
      return Promise.reject(new Error('No matching post found to like'));
    }

    return result;
  } catch (error) {
    return Promise.reject(error);
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
};
