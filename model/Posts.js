import mongoose, { model } from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: { type: String, required: true },
    imageUrl: { type: String },
    title: {
      type: String,
    },
    body: {
      type: String,
      required: true,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const Posts = model('Posts', postSchema); // Use 'Posts' instead of 'posts'
export default Posts;
