import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    actionTaken: {
      type: String, // e.g., 'deleted', 'warned', 'banned', 'dismissed'
      enum: ['deleted', 'warned', 'banned', 'dismissed', 'none'],
      default: 'none',
    },
    comments: [
      {
        type: String, // Admin comments or notes
      },
    ],
    resolved: {
      type: Boolean,
      default: false, // Indicates if the report has been resolved
    },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
    },
    title: {
      type: String,
    },
    body: {
      type: String,
    },
    location: {
      type: String,
    },  
    hashTags: [
      {
        type: String,
        index: true,
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [commentSchema],
    reports : [reportSchema]
  },
  { timestamps: true } 
);

const Posts = mongoose.model('Post', postSchema); 
export default Posts;
