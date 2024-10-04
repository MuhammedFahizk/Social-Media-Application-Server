import { User } from '../model/User.js';

export const manageOnline = async (userId, online) => {
  try {
    const updateData = { online: online };
  
    if (!online) {
      updateData.lastSeen = new Date();
    }
  
    await User.updateOne(
      { _id: userId }, 
      { $set: updateData } 
    );
      
    console.log(`User ${userId} is now ${online ? 'online' : `offline (last seen: ${new Date().toLocaleString()})`}`);
  } catch (error) {
    console.error('Error updating online status or last seen:', error);
  }
};

