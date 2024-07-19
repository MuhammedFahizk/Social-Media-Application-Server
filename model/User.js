import mongoose, { model } from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
  },
  profilePicture: { type: String },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' ,unique: true, default: []}],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' ,unique: true, default: [] }],
  token: { type: String, required: false },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  // stories: [{ type: mongoose.Schema.Types.ObjectId,}],
});


const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 },
});
const Otp = model('Otp', otpSchema);
const User = model('User', userSchema);
export { User, Otp };