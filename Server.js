import express from 'express';
import { config } from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import connectDB from './config/database.js';
import adminRoutes from './router/AdminRoute.js';
import userRoutes from './router/UserRouter.js';
import cookieParser from 'cookie-parser'; // Import cookie-parser using ES Modules
import { createServer } from 'http';
import { Server } from 'socket.io';
import users from './services/usersNotfic.js';
import { attachIo } from './Middlewares/attachIo.js';

config();

const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:5173',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));
app.use(cookieParser());

// Connect to database
connectDB().catch((err) => console.error('Database connection failed:', err));
app.use(attachIo(io)); 
// Routes
app.use(morgan('tiny'));
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Socket.IO logic
io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  socket.on('registerUser', (userId) => {
    console.log('userId', userId);
    users.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ID ${socket.id}`);
  })
  // socket.on('sendNotification', (data) => {
  //   console.log('Sending notification to:', data.recipient);
  //   io.to(data.recipient).emit('newNotification', data.message);
  // });  
  socket.on('sendNotification', ({ recipientId, message }) => {
    const recipientSocketId = users.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('newNotification', { message });
      console.log(`Notification sent to user ${recipientId}`);
    } else {
      console.error(`Recipient ${recipientId} not connected`);
    }
  });
  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
  });
});
// Correctly start the server using httpServer
const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => console.warn(`Server running at http://localhost:${PORT}`));
