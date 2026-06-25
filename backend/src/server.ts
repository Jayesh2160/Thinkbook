import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { setupSocketHandler } from './sockets/socketHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*', // We allow all for dev, or process.env.CLIENT_URL
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Setup socket connection handling
setupSocketHandler(io);

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/thinkbook';
const PORT = process.env.PORT || 5000;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully.');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
