import Notification from '../../model/Notification.js';
import Posts from '../../model/Posts.js';
import { User } from '../../model/User.js';
import users from '../../services/usersNotfic.js';

export const getAllReportsHelper = async () => {
  try {
    const reports = await Posts.aggregate([
      {
        $unwind: '$reports',
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reports.reporter',
          foreignField: '_id',
          as: 'reporterDetails',
        },
      },
      {
        $unwind: '$reporterDetails', 
      },
      {
        $project: {
          _id: 0,
          'reportId': '$reports._id',
          'postId': '$_id',
          'content': '$content',
          'reportReason': '$reports.reason',
          'reportAction': '$reports.actionTaken',
          'reportResolved': '$reports.resolved',
          'reportComments': '$reports.comments',
          'reportCreatedAt': '$reports.createdAt',
          'reporterDetails._id': 1,
          'reporterDetails.username': 1,
          'reporterDetails.email': 1,
        },
      },
      {
        $match: {
          'reportResolved': false,
        },
      },
      {
        $sort: { 'reportCreatedAt': -1 }, 
      },
    ]);
  
    return reports;
  } catch (error) {
    console.error('Error in getAllReportsHelper:', error);
    throw new Error('Error fetching reports');
  }
};


export const dismissReportHelper = async (reportId, postId, comment) => {
  try {
    // Find the post by ID
    const post = await Posts.findById(postId);
  
    // Check if the post exists
    if (!post) {
      throw new Error('Post not found');
    }
  
    // Find the report in the post's reports array and update it
    const reportIndex = post.reports.findIndex(report => report._id.toString() === reportId);
      
    if (reportIndex === -1) {
      throw new Error('Report not found');
    }
  
    // Update the report's actionTaken and add the comment if provided
    post.reports[reportIndex].actionTaken = 'dismissed';
    if (comment) {
      post.reports[reportIndex].comments.push(comment);
    }
  
    post.reports[reportIndex].resolved = true;
  
    await post.save();
  
    return post; 
  } catch (error) {
    console.error('Error dismissing report:', error);
    throw error;
  }
};


export const banUserHelper = async (reportId, postId, comment) => {
  try {
    // Find the post by ID
    const post = await Posts.findById(postId).populate('author'); 
    if (!post) {
      throw new Error('Post not found');
    }
  
    // Find the report in the post's reports array
    const reportIndex = post.reports.findIndex(report => report._id.toString() === reportId);
    if (reportIndex === -1) {
      throw new Error('Report not found');
    }
  
    const userIdToBan = post.author; // Assuming the report has a 'reporter' field
  
    // Find the user by ID
    const user = await User.findById(userIdToBan);
    if (!user) {
      throw new Error('User not found');
    }
  
    // Check if the user is already blocked
    if (user.isBlocked && user.isBlocked.status) {
      throw new Error('User is already blocked');
    }
  
    // Update the user's blocked status to true
    user.isBlocked = { status: true }; // Set the user to blocked
    await user.save();
  
    // Update the report with the action taken and admin comments
    post.reports[reportIndex].actionTaken = 'banned'; // Set the action taken
    if (comment) {
      post.reports[reportIndex].comments.push(comment); // Add the admin comment
    }
    post.reports[reportIndex].resolved = true; // Mark report as resolved
  
    await post.save(); // Save the updated post
  
    return { message: 'User has been banned and report resolved' }; // Return success message
  } catch (error) {
    console.error('Error banning user:', error);
    throw error; // Re-throw the error for handling in the controller
  }
};

export const notifyDeletePost = async (post, adminId, io) => {
  try {
    // Find the post by ID to get the author's details
   console.log('hai', post);
   
  
    const notificationMessage = `Your post "${post.title || post._id}" has been deleted by an admin.`;
  
    // Check if the author exists
    if (!post.author) {
      throw new Error('Author not found');
    }
  
    // Prepare notification details
    const details = {
      userName: 'Chat-Hive Admin' ,
      profilePicture: adminId.profilePicture,
    };
  
    // Check if the author is online
    const socketId = users.get(post.author._id.toString());
    const delivered = socketId ? true : false;
  
    // Create and save the notification
    const notification = new Notification({
      userId: post.author._id,
      senderId: adminId,
      type: 'admin_message',
      message: notificationMessage,
      isRead: false,
      delivered: delivered,
    });
  
    await notification.save();
  
    if (delivered) {
      io.to(socketId).emit('newNotification', {
        notification,
        senderDetails: details,
      });
    } else {
      console.error(`User ${post.author._id} not connected`);
    }
  
    return notification;
  } catch (error) {
    console.error('Error in notifyDeletePost:', error);
    throw error;
  }
};