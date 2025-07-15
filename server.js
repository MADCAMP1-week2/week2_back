const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./db');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const todoRoutes = require('./routes/todoRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const projectRoutes = require('./routes/projectRoutes');
const userRoutes = require('./routes/userRoutes');
const busynessRoutes = require('./routes/busynessRoutes');
const { authenticateAccessToken } = require("./middlewares/authMiddleware");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/todos', authenticateAccessToken, todoRoutes);
app.use('/api/schedules', authenticateAccessToken, scheduleRoutes);
app.use('/api/projects', authenticateAccessToken, projectRoutes);
app.use('/api/users', authenticateAccessToken, userRoutes);
app.use('/api/busyness', authenticateAccessToken, busynessRoutes);

app.listen(process.env.PORT || 4000, () => {
  console.log('서버 시작');
});

require('./scheduler/calculateBusynessJob');
