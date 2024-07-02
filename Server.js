import express from 'express';
import { config } from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';

import connectDB from './config/database.js';
import adminRoutes from './router/AdminRoute.js';
import userRoutes from './router/UserRouter.js';

config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:5173',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

// Connect to database
connectDB().catch((err) => console.error('Database connection failed:', err));

// Routes
app.use(morgan('tiny'));

morgan.token('param', function(req, res, param) {
  return req.params[param];
});
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Basic error handling middleware


const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.warn(`Server running at http://localhost:${PORT}`));
