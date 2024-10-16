# CHAt_hive - Express Backend API

This is the backend API for the **CHAT-hive** application, built using Node.js and Express. It provides functionalities for user and admin management, post handling, notifications, and more. The API supports user authentication, real-time messaging, and integration with services like Google for login and Cloudinary for file storage.

## Table of Contents
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Dependencies](#dependencies)
- [License](#license)

## Features
- User authentication with JWT and Google login.
- Admin management of users, posts, and reports.
- Notification system for user updates.
- File uploads to Cloudinary.
- Socket.io integration for real-time messaging.

## API Endpoints

### Admin Routes
- **POST** `/login`: Admin login
- **POST** `/generateAccessToken`: Generate a new access token
- **POST** `/loginWithGoogle`: Google authentication for admin
- **GET** `/users`: List all users
- **GET** `/users/:id`: Fetch user by ID
- **PUT** `/blockUser/:id`: Block a user
- **PUT** `/unblockUser/:id`: Unblock a user
- **GET** `/fetchPosts/:value`: Fetch posts based on the provided value
- **GET** `/fetchPost/:postId`: Fetch a specific post
- **GET** `/fetchDashBoard`: Fetch dashboard statistics
- **POST** `/send-Notification`: Send notifications to users
- **GET** `/reports`: Fetch all reports
- **PUT** `/reports/:reportId/:postId/delete-post`: Delete a post and resolve report
- **PUT** `/reports/:reportId/:postId/ban-user`: Ban a user and resolve report
- **PUT** `/reports/:reportId/:postId/dismiss`: Dismiss a report

### User Routes
- **POST** `/signUp`: User registration
- **POST** `/login`: User login
- **POST** `/loginWithGoogle`: Google login for users
- **GET** `/homePage`: Fetch homepage data
- **GET** `/profile/:id`: Fetch user profile by ID
- **POST** `/createPost/:content`: Create a new post
- **GET** `/fetchPosts/:heading/:offset`: Fetch posts with pagination
- **POST** `/report-post`: Report a post

### Messaging Routes
- **GET** `/chats/:userId`: Fetch chats for a user
- **POST** `/chats/:receiver/messages`: Send a message
- **DELETE** `/clearChat`: Clear chat history

## Dependencies

This project uses the following packages:
- **argon2**: Password hashing
- **express**: Web framework
- **mongoose**: MongoDB object modeling
- **jsonwebtoken**: For generating and verifying tokens
- **multer**: File upload middleware
- **nodemailer**: For sending emails
- **socket.io**: For real-time communication
- **cloudinary**: For cloud-based image storage

For a complete list, refer to the `package.json` file.

## Additional Features
- **Real-time Chat**: Enables instant messaging between users.
- **User-Friendly Notifications**: Provides alerts for important updates.
- **Admin Controls**: Allows for the management of user accounts and content moderation.
- **Secure File Handling**: Utilizes Cloudinary for efficient media storage.
- **Dynamic Post Handling**: Supports creating, fetching, and reporting posts.

## License

This project is licensed under the [ISC License](LICENSE).
