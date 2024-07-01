const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');

const connectDB = require('./config/database');
const adminRoutes = require('./router/AdminRoute');

dotenv.config();

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(
  {
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  },
));

// Connect to database
connectDB().catch((err) => console.error('Database connection failed:', err));

// Routes
app.use('/admin', adminRoutes);
// app.use('/', require('userRoutes');

// Basic error handling middleware
app.use((err, req, res) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.warn(`Server running at http://localhost:${PORT}`));
