import { verify } from 'argon2';
import Admin from '../model/AdminModel.js';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../model/User.js';
import Posts from '../model/Posts.js';
import  fetchMonthlyUserData  from '../services/fetchMonthlyUserData.js';
import users from '../services/usersNotfic.js';
import { ObjectId } from 'mongodb';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const adminLoginHelper = (loginData) =>
  new Promise((resolve, reject) => {
    const { email, password } = loginData;

    Admin.findOne({ email })
      .then(async (admin) => {
        if (!admin) {
          throw new Error('Email or Password is Mismatch',email);
        }
        console.log(password);
        const isPasswordValid = await verify(admin.password, password);
        if (isPasswordValid) {
          resolve(admin);
        } else {
          reject(new Error('Invalid password', password));
        }
      })
      .catch((error) => {
        console.log(error);
        reject(error);
      });
  });


const fetchAdminHelper = () => {
  return new Promise((resolve, reject) => {
    Admin.find()
      .then((admins) => {
        resolve(admins);
      })
      .catch((error) => {
        reject(error);
      });
  });
};
const logoutHelper = async (refreshToken) => {
  try {
    console.log(refreshToken);
    
    const user = await Admin.findOne({ token: refreshToken });
    if (user) {
      user.token = null;
      await user.save();
      return user;
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    console.log('error', error);
    throw new Error(error.message);
  }
};
const adminGoogleLoginHelper = async (credential) => {
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
    console.error('Response:', response.payload);

    const { email_verified, email } = response.payload;
    console.error('Email verified:', email_verified, email);
    return response.payload;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw error; // Rethrow the error to be caught by the calling function
  }
};

const googleLoginAdmin = async (user) => {
  return new Promise((resolve, reject) => {
    const { email } = user;
    Admin.findOne({ email })
      .then((admin) => {
        if (admin) {
          resolve(admin);
        } else {
          reject(new Error('User not found'));
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const usersHelper = async () => {
  return new Promise((resolve, reject) => {
    User.find()
      .then((users) => {
        resolve(users);
      })
      .catch((error) => {
        reject(error);
      });
  });
};
const fetchUserHelper = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findById(id)
        .populate('following')
        .populate('followers');

      if (!user) {
        return reject(new Error('User not found'));
      }

      const posts = await Posts.find({ author: new ObjectId(id) });

      resolve({ user, posts });
    } catch (error) {
      reject(error);
    }
  });
};

const blockUserHelper = (id) => {
  return new Promise((resolve, reject) => {
    User.findByIdAndUpdate(
      id,
      {
        $set: {
          'isBlocked.status': true, // Update status to true
          'isBlocked.createdAt': Date.now(), // Set createdAt timestamp
        },
      },
      { new: true } // Return the updated document
    )
      .then((user) => {
        resolve(user); // Successfully resolved with updated user
      })
      .catch((error) => {
        reject(error); // Handle any errors
      });
  });
};


const migrateIsBlockedField = async () => {
  try {
    // Find all users with isBlocked set to true
    const users = await User.find();

    for (const user of users) {
      // Update the isBlocked field to the new structure
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            isBlocked: {
              status: false, // Set status to true
              createdAt: Date.now(), // Set createdAt to current date
            },
          },
        }
      );
    }

    console.log('Migration complete. All users updated.');
  } catch (error) {
    console.error('Error during migration:', error);
  }
};

// Call the migration function


// Call the migration function



const unblockUserHelper = (id) => {
  return new Promise((resolve, reject) => {
    User.findByIdAndUpdate(id, { $set: { isBlocked: false } }, { new: true })
      .then((user) => {
        resolve(user);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const fetchPostsHelper = (value, search) => {
  return new Promise((resolve, reject) => {
    const query = { content: value };

    if (search) {
      if (value === 'blog') {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { hashTags: { $elemMatch: { $regex: search, $options: 'i' } } },
        ];
      } else if (value === 'image') {
        query.hashTags = { $elemMatch: { $regex: search, $options: 'i' } };
      }
    }

    Posts.find(query)
      .populate('author')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          model: 'User',
        },
      })
      .sort({ createdAt: -1 })
      .then((posts) => {
        resolve(posts);
      })
      .catch((error) => {
        reject(error);
      });
  });
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

const fetchDashBoardHelper = async () => {
  try {
    const userMatrix = await User.aggregate([
      {
        $facet: {
          totalUsers: [{ $count: 'count' }],
          activeUsers: [
            {
              $match: {
                lastActive: {
                  $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
              },
            },
            { $count: 'count' },
          ],
          blockedUser: [
            {
              $match: {
                'isBlocked.status': true
              },
            },
            { $count: 'count' },
          ],
          newUsers: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
              },
            },
            { $count: 'count' },
          ],
          newUsersCurrentMonth: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of current month
                },
              },
            },
            { $count: 'count' },
          ],
          blockedUsersCurrentMonth: [
            {
              $match: {
                'isBlocked.status': true,
                'isBlocked.createdAt': {
                  $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1), 
                },
              },
            },
            { $count: 'count' },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          totalUsers: {
            $ifNull: [{ $arrayElemAt: ['$totalUsers.count', 0] }, 0],
          },
          activeUsers: {
            $ifNull: [{ $arrayElemAt: ['$activeUsers.count', 0] }, 0],
          },
          blockedUser: {
            $ifNull: [{ $arrayElemAt: ['$blockedUser.count', 0] }, 0],
          },
          newUsers: {
            $ifNull: [{ $arrayElemAt: ['$newUsers.count', 0] }, 0],
          },
          newUsersCurrentMonth: {
            $ifNull: [{ $arrayElemAt: ['$newUsersCurrentMonth.count', 0] }, 0],
          },
          blockedUsersCurrentMonth: { // Add this line for the blocked users
            $ifNull: [{ $arrayElemAt: ['$blockedUsersCurrentMonth.count', 0] }, 0],
          },
        },
      },
    ]);

    // Formatting user result
    const userResult = {
      totalUsers: {
        label: 'Total Users',
        count: userMatrix[0].totalUsers,
      },
      activeUsers: {
        label: 'Active Users (Last 24h)',
        count: userMatrix[0].activeUsers,
      },
      blockedUsers: {
        label: 'Blocked Users',
        count: userMatrix[0].blockedUser,
      },
      newUsers: {
        label: 'New Users (Last 24h)',
        count: userMatrix[0].newUsers,
      },
      newUsersCurrentMonth: {
        label: ' Users',
        count: userMatrix[0].newUsersCurrentMonth,
      },
      blockedUsersCurrentMonth: { // Add blocked users for the current month
        label: 'Blocked Users ',
        count: userMatrix[0].blockedUsersCurrentMonth,
      },
    };

    // Aggregating post data
    const postMatrix = await Posts.aggregate([
      {
        $facet: {
          totalPosts: [{ $count: 'count' }],
          images: [
            {
              $match: {
                content: 'image',
              },
            },
            { $count: 'count' },
          ],
          blogs: [
            {
              $match: {
                content: 'blog',
              },
            },
            { $count: 'count' },
          ],
          PopularPosts: [
            {
              $match: {
                $expr: {
                  $gte: [
                    { $size: '$comments' },
                    2
                  ],
                },
                $expr: {
                  $gte: [
                    { $size: '$likes' },
                    2
                  ],
                },
              },
            },
            { $count: 'count' }, // Ensure counting popular posts
          ],
          newPostsCurrentMonth: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of current month
                },
              },
            },
            { $count: 'count' },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          totalPosts: {
            $ifNull: [{ $arrayElemAt: ['$totalPosts.count', 0] }, 0],
          },
          images: {
            $ifNull: [{ $arrayElemAt: ['$images.count', 0] }, 0],
          },
          blogs: {
            $ifNull: [{ $arrayElemAt: ['$blogs.count', 0] }, 0],
          },
          PopularPosts: {
            $ifNull: [{ $arrayElemAt: ['$PopularPosts.count', 0] }, 0],
          },
          newPostsCurrentMonth: {
            $ifNull: [{ $arrayElemAt: ['$newPostsCurrentMonth.count', 0] }, 0],
          },
        },
      },
    ]);

    // Formatting post result
    const postResult = {
      totalPosts: {
        label: 'Total Posts',
        count: postMatrix[0].totalPosts,
      },
      images: {
        label: 'Posts with Images',
        count: postMatrix[0].images,
      },
      blogs: {
        label: 'Posts with Blogs',
        count: postMatrix[0].blogs,
      },
      popularPosts: {
        label: 'Popular Posts',
        count: postMatrix[0].PopularPosts,
      },
      newPostsCurrentMonth: {
        label: ' Posts ',
        count: postMatrix[0].newPostsCurrentMonth,
      },
    };
    const fullMonthlyData = await fetchMonthlyUserData();
    return { userResult, postResult , fullMonthlyData};
  } catch (error) {
    console.error(`Error fetching dashboard data: ${error.message}`);
    throw new Error(`Error fetching dashboard data: ${error.message}`);
  }
};

// notification
const sendNotificationHelper = async (message, recipients, adminId, io) => {
  try {
    // Find the admin by ID
    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Create notifications for each recipient
    const notifications = recipients.map(userId => ({
      message,
      recipient: userId,
    }));

    // Push notifications to the admin's notifications array
    admin.notifications.push(...notifications);
    await admin.save();

    // Emit notifications to each recipient via Socket.IO
    recipients.forEach(userId => {
      const socketId = users.get(userId);

      if (socketId) {
        io.to(socketId).emit('newNotification', { userId, message });
      } else {
        console.error(`User ${userId} not connected`);
        
        // Optionally handle offline users here
      }
    });

    return true;
  } catch (error) {
    console.error(`Error sending notification: ${error.message}`);
    throw new Error(error.message);
  }
};


export {
  fetchAdminHelper,
  adminLoginHelper,
  fetchUserHelper,
  adminGoogleLoginHelper,
  googleLoginAdmin,
  usersHelper,
  blockUserHelper,
  unblockUserHelper,
  fetchPostsHelper,
  fetchPostHelper,
  fetchDashBoardHelper,
  logoutHelper,
  sendNotificationHelper,
  migrateIsBlockedField

  //report

  
};
