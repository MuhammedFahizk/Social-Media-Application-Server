import mongoose, { model } from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema({
  message: {
    type: String,
    required: true,
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});


const adminSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  lastLogin: {
    type: Date,
  },
  profile: {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    image: {
      type: String,
    },
  },
  notifications: [notificationSchema],
  // token: {
  createdAt: { type: Date, default: Date.now(), expires: 10 * 86400 },
  token: { type: String,},
  // }
});

const Admin = model('Admin', adminSchema);

export default Admin;
