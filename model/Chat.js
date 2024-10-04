import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const chatSchema = new Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, required: true },
  isRead: { type: Boolean, default: false },
  isDeletedBySender: { type: Boolean, default: false },  // Deletion status for the sender
  isDeletedByReceiver: { type: Boolean, default: false },  // Deletion status for the receiver
  messageType: { type: String, enum: ['text', 'image'], default: 'text' },
  mediaUrl: { type: String },
  chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom' },
  status: {
    type: String, 
    enum: ['sent', 'delivered', 'read'], 
    default: 'sent' 
  }
});

chatSchema.index({ sender: 1, receiver: 1, timestamp: 1 });

const Chat = model('Chat', chatSchema);

export { Chat };
