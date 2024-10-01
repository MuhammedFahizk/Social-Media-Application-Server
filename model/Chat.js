import mongoose from 'mongoose';
const { Schema, model } = mongoose;  // Ensure you destructure both Schema and model

const chatSchema = new Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, required: true },
  isRead: { type: Boolean, default: false },
  messageType: { type: String, enum: ['text', 'image'], default: 'text' },
  mediaUrl: { type: String },
  chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom' },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'], 
    default: 'sent' 
  }
});

// Creating an index for optimized queries
chatSchema.index({ sender: 1, receiver: 1, timestamp: 1 });

// Correctly defining and exporting the Chat model
const Chat = model('Chat', chatSchema);  // Make sure to provide the model name 'Chat'

export { Chat };
