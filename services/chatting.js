import { ObjectId } from 'mongodb';
import users from './usersNotfic.js';
import { Chat } from '../model/Chat.js';
import { User } from '../model/User.js';

const deliverUndeliveredChatting = async (userId, io) => {
  try {
    // Fetch undelivered chat messages for the user
    const chats = await Chat.aggregate([
      {
        $match: {
          $and: [
            { receiver: new ObjectId(userId) },
            { status: { $ne: 'delivered' } }
          ]
        }
      }
    ]);

    const socketId = users.get(userId);
    if (socketId) {
      for (const chat of chats) {
        io.to(socketId).emit('newNotification', chat);
        // Update message status to 'delivered'

        await Chat.updateOne({ _id: chat._id }, { $set: { status: 'delivered' } });
      }
    } else {
      console.error(`No socketId found for user ${userId}`);
    }
  } catch (error) {
    console.error('Error delivering undelivered messages:', error);
  }
};

export const isNewSenderForReceiver = async (senderId, receiverId, onlineUsers) => {
  try {

    const friends = await Chat.aggregate([
      {
        $match: {
          $or: [
            { sender: new ObjectId(receiverId) },
            { receiver: new ObjectId(receiverId) }
          ]
        }
      },
      {
        $sort: { timestamp: -1 } // Sort by timestamp in descending order to get the latest chats first
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', new ObjectId(receiverId)] },
              '$receiver',
              '$sender'
            ]
          },
          latestChat: { $first: '$$ROOT' } // Get the latest chat for each user
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'friendInfo'
        }
      },
      {
        $unwind: '$friendInfo'
      },
      {
        $project: {
          _id: 0,
          friendInfo: 1,
          latestChat: 1
        }
      },
      {
        $sort: { 'latestChat.timestamp': -1 } // Ensure friends are sorted by the latest chat timestamp
      }
    ]);

    const result = friends.map(({ friendInfo, latestChat }) => ({
      ...friendInfo,
      latestChat,
      online: users.has(friendInfo._id.toString())
    }));

    return result;
  } catch (error) {
    // Handle the error appropriately (e.g., log it, throw it, etc.)
    console.error('Error fetching chat list:', error);
    throw error; // This will be caught by the fetchChatList function
  }
};
export default deliverUndeliveredChatting;
