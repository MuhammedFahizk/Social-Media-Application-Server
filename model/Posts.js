import mongoose from 'mongoose';

// Define a schema for comments
const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
  },
},
{timestamps: true}
);

// Define the schema for posts
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
      required: true 
    },
    imageUrl: { 
      type: String 
    },
    title: {
      type: String,
    },
    body: {
      type: String,
    },
    hashTags: [{
      type: String,
      index: true,
    }],
    likes: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      }
    ],
    comments: [commentSchema], // Use the comment schema for comments

  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

// Create and export the model
const Posts = mongoose.model('Post', postSchema); // Use 'Post' instead of 'Posts'
export default Posts;
