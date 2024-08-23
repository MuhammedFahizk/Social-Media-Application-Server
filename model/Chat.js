
import mongoose, { model } from 'mongoose';
const { Schema } = mongoose;
const chatSchema = new Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User who sent the message
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User who receives the message
  content: { type: String, required: true }, // The actual message content
  timestamp: { type: Date, default: Date.now, required: true }, // Time when the message was sent
  isRead: { type: Boolean, default: false }, // Status of whether the message has been read
  messageType: { type: String, enum: ['text', 'image',], default: 'text' }, // Type of message (text, image, etc.)
  mediaUrl: { type: String }, // URL to media file if the messageType is not 'text'
  chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom' } // Optional field if messages are part of a chat room
});

const Chat = model(chatSchema);
export { Chat };
  