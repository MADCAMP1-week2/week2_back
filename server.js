const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./db');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);

app.listen(process.env.PORT || 4000, () => {
  console.log('서버 시작');
});