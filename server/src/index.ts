import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
// import { Server } from 'socket.io'; // Commented out until Phase 2
// import http from 'http';

dotenv.config();

const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*", // Allow all origins for dev
//     methods: ["GET", "POST"]
//   }
// });

app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Health Check
app.get('/', (req, res) => {
    res.send('MedEcho Backend is running');
});

// Import Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import reportRoutes from './routes/reportRoutes';
import mlRoutes from './routes/mlRoutes';
import scheduleRoutes from './routes/scheduleRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/schedules', scheduleRoutes);

// Socket.io Connection (Placeholder for Phase 2)
// io.on('connection', (socket) => {
//   console.log('A user connected:', socket.id);
//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//   });
// });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
