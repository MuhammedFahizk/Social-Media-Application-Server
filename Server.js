import express from 'express';
import { config } from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import connectDB from './config/database.js';
import adminRoutes from './router/AdminRoute.js';
import userRoutes from './router/UserRouter.js';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import users from './services/usersNotfic.js';
import { attachIo } from './Middlewares/attachIo.js';
import { deliverUndeliveredNotifications } from './services/Notification.js';
import { manageOnline } from './services/onlineLastSeenHandler.js';
// import deliverUndeliveredChatting from './services/chatting.js';

config();

const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5174',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 100000, // Set global ping timeout (in milliseconds)
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: 'http://localhost:5174',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  })
);
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
  socket.on('registerUser', (userId) => {
    users.set(userId, socket.id);
    console.error('User connected:', userId);
    deliverUndeliveredNotifications(userId, io);
    manageOnline(userId, true );

    // deliverUndeliveredChatting(userId, io);
  });

  socket.on('disconnect', () => {
    console.error('User disconnected', socket.id);
    for (const [userId, id] of users.entries()) {
      if (id === socket.id) {
        console.error('User disconnected:', userId);
        manageOnline(userId, false );
        // Remove the user from the map
        users.delete(userId);
        break; // Exit the loop once the user is found and removed
      }
    }
  });

});
// Correctly start the server using httpServer
const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () =>
  console.warn(`Server running at http://localhost:${PORT}`)
);
