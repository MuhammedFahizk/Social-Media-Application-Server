import Notification from '../model/Notification.js';
import users from './usersNotfic.js';
import { ObjectId } from 'mongodb';

const deliverUndeliveredNotifications = async (userId, io) => {
  try {
    const notifications = await Notification.aggregate([
      {
        $match: {
          $and:[ 
            { userId: new ObjectId(userId),},

            {delivered: false,}]
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
        $project: {
          notification: {
            userId: '$userId',
            senderId: '$senderId',
            type: '$type',
            message: '$message',
            isRead: '$isRead',
            _id: '$_id',
            createdAt: '$createdAt',
          },
          senderDetails: {
            userName: '$senderDetails.userName',
            profilePicture: '$senderDetails.profilePicture',
          },
        },
      },
    ]);

    const socketId = users.get(userId);
    if (socketId) {
      for (const notif of notifications) {
        io.to(socketId).emit('newNotification', notif);
        await Notification.updateOne({ _id: notif._id }, { delivered: true });
      }
    } else {
      console.error(`No socketId found for user ${userId}`);
    }
    
  } catch (error) {
    console.error('Error in deliverUndeliveredNotifications:', error);
  }
};
 
export { deliverUndeliveredNotifications };
